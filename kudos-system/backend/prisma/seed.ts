import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const saltRounds = 12;

  // Admin
  const adminEmail = 'admin@datacom.com';
  const adminPassword = 'password123';
  const adminHash = await bcrypt.hash(adminPassword, saltRounds);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Administrator',
      passwordHash: adminHash,
      role: 'admin',
      isActive: true,
    },
    create: {
      name: 'Administrator',
      email: adminEmail,
      passwordHash: adminHash,
      role: 'admin',
      isActive: true,
    },
  });

  // Employees
  const employeeSpecs = [
    { name: 'Alice Johnson', email: 'alice.johnson@datacom.com' },
    { name: 'Bob Smith', email: 'bob.smith@datacom.com' },
    { name: 'Carla Reyes', email: 'carla.reyes@datacom.com' },
    { name: 'Daniel Kim', email: 'daniel.kim@datacom.com' },
  ];

  const employees = [] as any[];
  for (const spec of employeeSpecs) {
    const hash = await bcrypt.hash('password123', saltRounds);
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: {
        name: spec.name,
        passwordHash: hash,
        role: 'employee',
        isActive: true,
      },
      create: {
        name: spec.name,
        email: spec.email,
        passwordHash: hash,
        role: 'employee',
        isActive: true,
      },
    });
    employees.push(user);
  }

  // Sample kudos between employees
  // employees[0] -> employees[1], employees[1] -> employees[2], employees[2] -> employees[3]
  const kudosSamples = [
    { senderId: employees[0].id, recipientId: employees[1].id, message: 'Great collaboration on the Q2 report — really appreciated your insights!' },
    { senderId: employees[1].id, recipientId: employees[2].id, message: 'Thanks for helping debug that tricky issue today.' },
    { senderId: employees[2].id, recipientId: employees[3].id, message: 'Awesome work leading the demo — you nailed the presentation.' },
  ];

  for (const k of kudosSamples) {
    await prisma.kudos.create({ data: k });
  }

  console.log('Seeding completed.');
  console.log('Admin user:', admin.email, `(ID: ${admin.id})`);
  console.log('Employee users:', employees.map(e => `${e.name} (${e.email})`).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
