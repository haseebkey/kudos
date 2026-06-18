import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const router = express.Router();

// GET / - list active users excluding current user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const currentId = Number(req.user?.id);
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: currentId },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
