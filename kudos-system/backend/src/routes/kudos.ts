import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const router = express.Router();

// GET / - paginated feed
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
  const skip = (page - 1) * pageSize;

  const isAdmin = req.user?.role === 'admin';
  const where: any = {};
  if (!isAdmin) {
    where.isVisible = true;
  }

  try {
    const [total, data] = await Promise.all([
      prisma.kudos.count({ where }),
      prisma.kudos.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          sender: { select: { id: true, name: true, email: true, role: true } },
          recipient: { select: { id: true, name: true, email: true, role: true } },
          moderatedBy: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
    ]);

    return res.json({ data, page, pageSize, total });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch kudos' });
  }
});

// GET /feed - PUBLIC paginated feed (no auth required)
router.get('/feed', async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
  const skip = (page - 1) * pageSize;

  try {
    const [total, data] = await Promise.all([
      prisma.kudos.count({ where: { isVisible: true } }),
      prisma.kudos.findMany({
        where: { isVisible: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          sender: { select: { id: true, name: true, email: true, role: true } },
          recipient: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
    ]);

    return res.json({ data, page, pageSize, total });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch kudos' });
  }
});

// POST / - create kudos with validation and spam check
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const senderId = Number(req.user?.id);
  const { recipientId, message } = req.body;

  if (!recipientId) {
    return res.status(400).json({ error: 'recipientId is required' });
  }

  const recipientIdNum = Number(recipientId);
  if (isNaN(recipientIdNum)) {
    return res.status(400).json({ error: 'recipientId must be a number' });
  }

  if (!message || typeof message !== 'string' || message.trim().length < 1 || message.length > 500) {
    return res.status(400).json({ error: 'message must be 1-500 characters' });
  }

  if (recipientIdNum === senderId) {
    return res.status(400).json({ error: 'Cannot send kudos to yourself' });
  }

  try {
    // Optional: verify recipient exists
    const recipient = await prisma.user.findUnique({ where: { id: recipientIdNum } });
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Spam check: same sender+recipient within 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recent = await prisma.kudos.findFirst({
      where: {
        senderId,
        recipientId: recipientIdNum,
        createdAt: { gt: tenMinutesAgo },
      },
    });

    if (recent) {
      return res.status(429).json({ error: 'Too many requests: please wait before sending another kudos to this recipient' });
    }

    const created = await prisma.kudos.create({
      data: {
        senderId,
        recipientId: recipientIdNum,
        message: message.trim(),
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create kudos' });
  }
});

// PATCH /:id/visibility - admin only
router.patch('/:id/visibility', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const { isVisible, moderationReason } = req.body;
  if (typeof isVisible !== 'boolean') {
    return res.status(400).json({ error: 'isVisible (boolean) is required' });
  }

  if (isVisible === false && (!moderationReason || typeof moderationReason !== 'string' || moderationReason.trim() === '')) {
    return res.status(400).json({ error: 'moderationReason is required when hiding a kudos' });
  }

  try {
    const kudos = await prisma.kudos.findUnique({ where: { id } });
    if (!kudos) return res.status(404).json({ error: 'Kudos not found' });

    const adminId = Number(req.user?.id);
    const updateData: any = {
      isVisible,
      moderationReason: isVisible ? null : moderationReason.trim(),
      moderatedAt: isVisible ? null : new Date(),
      moderatedById: isVisible ? null : adminId,
    };

    const updated = await prisma.kudos.update({ where: { id }, data: updateData });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update visibility' });
  }
});

// DELETE /:id - admin only
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    await prisma.kudos.delete({ where: { id } });
    return res.status(204).send();
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Kudos not found' });
    }
    return res.status(500).json({ error: 'Failed to delete kudos' });
  }
});

export default router;
