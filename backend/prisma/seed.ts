import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const csDept = await prisma.department.upsert({
    where: { code: "CS" },
    update: {},
    create: { name: "Computer Science", code: "CS" },
  });

  const eeDept = await prisma.department.upsert({
    where: { code: "EE" },
    update: {},
    create: { name: "Electrical Engineering", code: "EE" },
  });

  const users = [
  { userId: "ADMIN001", password: "admin123", name: "System Admin", role: Role.ADMIN, departmentId: null },
  { userId: "EMP1001", password: "hod123", name: "Dr. Rajesh Kumar", role: Role.HOD, departmentId: csDept.id },
  { userId: "EMP1002", password: "staff123", name: "Prof. Anita Sharma", role: Role.STAFF, departmentId: csDept.id },
  { userId: "EMP1003", password: "coord123", name: "Ms. Priya Nair", role: Role.EVENT_COORDINATOR, departmentId: csDept.id },
  { userId: "STU2001", password: "student123", name: "Arjun Patel", role: Role.STUDENT, departmentId: csDept.id },
  { userId: "STU2002", password: "student123", name: "Sneha Reddy", role: Role.STUDENT, departmentId: csDept.id },
  { userId: "EMP1004", password: "hod123", name: "Dr. Vikram Singh", role: Role.HOD, departmentId: eeDept.id },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { userId: u.userId },
      update: { passwordHash, name: u.name, role: u.role, departmentId: u.departmentId },
      create: { userId: u.userId, passwordHash, name: u.name, role: u.role, departmentId: u.departmentId },
    });
  }

  const coord = await prisma.user.findUnique({ where: { userId: "EMP1003" } });
  const staff = await prisma.user.findUnique({ where: { userId: "EMP1002" } });
  const student1 = await prisma.user.findUnique({ where: { userId: "STU2001" } });
  const student2 = await prisma.user.findUnique({ where: { userId: "STU2002" } });

  const now = new Date();
  const eventStart = new Date(now);
  eventStart.setDate(eventStart.getDate() - 1);
  eventStart.setHours(9, 0, 0, 0);
  const eventEnd = new Date(eventStart);
  eventEnd.setHours(17, 0, 0, 0);

  const techFest = await prisma.event.upsert({
    where: { id: "seed-tech-fest" },
    update: {},
    create: {
      id: "seed-tech-fest",
      name: "CS Tech Fest 2026",
      description: "Annual technical festival for CS department",
      startTime: eventStart,
      endTime: eventEnd,
      departmentId: csDept.id,
    },
  });

  if (coord) {
    await prisma.eventCoordinator.upsert({
      where: { eventId_userId: { eventId: techFest.id, userId: coord.id } },
      update: {},
      create: { eventId: techFest.id, userId: coord.id },
    });
  }

  const punchTimes = [
    { user: staff, time: new Date(eventStart.getTime() + 8 * 3600000), direction: "IN" },
    { user: staff, time: new Date(eventStart.getTime() + 16 * 3600000), direction: "OUT" },
    { user: await prisma.user.findUnique({ where: { userId: "EMP1001" } }), time: new Date(eventStart.getTime() + 7.5 * 3600000), direction: "IN" },
  ];

  for (const [i, p] of punchTimes.entries()) {
    if (!p.user) continue;
    const esslLogId = `seed-punch-${i}`;
    await prisma.punchLog.upsert({
      where: { esslLogId },
      update: {},
      create: {
        userId: p.user.id,
        punchTime: p.time,
        direction: p.direction,
        deviceId: "DEV001",
        esslLogId,
      },
    });
  }

  if (student1) {
    await prisma.eventAttendance.upsert({
      where: { esslLogId: "seed-att-1" },
      update: {},
      create: {
        eventId: techFest.id,
        userId: student1.id,
        punchTime: new Date(eventStart.getTime() + 9.5 * 3600000),
        esslLogId: "seed-att-1",
      },
    });
  }

  if (student2) {
    await prisma.eventAttendance.upsert({
      where: { esslLogId: "seed-att-2" },
      update: {},
      create: {
        eventId: techFest.id,
        userId: student2.id,
        punchTime: new Date(eventStart.getTime() + 10 * 3600000),
        esslLogId: "seed-att-2",
      },
    });
  }

  await prisma.syncCursor.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
