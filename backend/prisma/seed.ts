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
    { userId: "ADMIN001", password: "admin123", name: "System Admin", role: Role.ADMIN, departmentId: null, batch: null },
    { userId: "EMP1001", password: "hod123", name: "Dr. Rajesh Kumar", role: Role.HOD, departmentId: csDept.id, batch: null },
    { userId: "EMP1002", password: "staff123", name: "Prof. Anita Sharma", role: Role.STAFF, departmentId: csDept.id, batch: null },
    { userId: "EMP1003", password: "coord123", name: "Ms. Priya Nair", role: Role.EVENT_COORDINATOR, departmentId: csDept.id, batch: null },
    { userId: "STU2001", password: "student123", name: "Arjun Patel", role: Role.STUDENT, departmentId: csDept.id, batch: "2024" },
    { userId: "STU2002", password: "student123", name: "Sneha Reddy", role: Role.STUDENT, departmentId: csDept.id, batch: "2024" },
    { userId: "STU2003", password: "student123", name: "Rohan Mehta", role: Role.STUDENT, departmentId: csDept.id, batch: "2025" },
    { userId: "EMP1004", password: "hod123", name: "Dr. Vikram Singh", role: Role.HOD, departmentId: eeDept.id, batch: null },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { userId: u.userId },
      update: {
        passwordHash,
        name: u.name,
        role: u.role,
        departmentId: u.departmentId,
        batch: u.batch,
      },
      create: {
        userId: u.userId,
        passwordHash,
        name: u.name,
        role: u.role,
        departmentId: u.departmentId,
        batch: u.batch,
      },
    });
  }

  const coord = await prisma.user.findUnique({ where: { userId: "EMP1003" } });
  const staff = await prisma.user.findUnique({ where: { userId: "EMP1002" } });
  const student1 = await prisma.user.findUnique({ where: { userId: "STU2001" } });
  const student2 = await prisma.user.findUnique({ where: { userId: "STU2002" } });
  const student3 = await prisma.user.findUnique({ where: { userId: "STU2003" } });

  const now = new Date();
  const eventStart = new Date(now);
  eventStart.setDate(eventStart.getDate() - 1);
  eventStart.setHours(9, 0, 0, 0);
  const eventEnd = new Date(eventStart);
  eventEnd.setHours(17, 0, 0, 0);

  const techFest = await prisma.event.upsert({
    where: { id: "seed-tech-fest" },
    update: {
      venue: "Main Auditorium",
      deviceIds: ["DEV001", "DEV002"],
    },
    create: {
      id: "seed-tech-fest",
      name: "CS Tech Fest 2026",
      description: "Annual technical festival for CS department",
      venue: "Main Auditorium",
      deviceIds: ["DEV001", "DEV002"],
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

  for (const student of [student1, student2, student3]) {
    if (!student) continue;
    await prisma.eventEnrollment.upsert({
      where: { eventId_userId: { eventId: techFest.id, userId: student.id } },
      update: { batch: student.batch },
      create: {
        eventId: techFest.id,
        userId: student.id,
        batch: student.batch,
      },
    });
  }

  const hod = await prisma.user.findUnique({ where: { userId: "EMP1001" } });

  const punchTimes = [
    { user: staff, time: new Date(eventStart.getTime() + 8 * 3600000), direction: "IN", device: "DEV001" },
    { user: staff, time: new Date(eventStart.getTime() + 16 * 3600000), direction: "OUT", device: "DEV001" },
    { user: hod, time: new Date(eventStart.getTime() + 7.5 * 3600000), direction: "IN", device: "DEV002" },
    { user: staff, time: new Date(eventStart.getTime() + 8.5 * 3600000), direction: "IN", device: "DEV003" },
    { user: hod, time: new Date(eventStart.getTime() + 9 * 3600000), direction: "IN", device: "DEV004" },
    { user: staff, time: new Date(eventStart.getTime() + 9.5 * 3600000), direction: "OUT", device: "DEV005" },
    { user: hod, time: new Date(eventStart.getTime() + 10 * 3600000), direction: "IN", device: "DEV006" },
    { user: staff, time: new Date(eventStart.getTime() + 10.5 * 3600000), direction: "IN", device: "DEV007" },
    { user: hod, time: new Date(eventStart.getTime() + 11 * 3600000), direction: "IN", device: "DEV008" },
    { user: staff, time: new Date(eventStart.getTime() + 11.5 * 3600000), direction: "IN", device: "DEV009" },
    { user: hod, time: new Date(eventStart.getTime() + 12 * 3600000), direction: "IN", device: "DEV010" },
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
        deviceId: p.device,
        esslLogId,
      },
    });
  }

  if (student1) {
    await prisma.eventAttendance.upsert({
      where: { esslLogId: "seed-att-1" },
      update: { deviceId: "DEV001" },
      create: {
        eventId: techFest.id,
        userId: student1.id,
        punchTime: new Date(eventStart.getTime() + 9.5 * 3600000),
        deviceId: "DEV001",
        esslLogId: "seed-att-1",
      },
    });
  }

  if (student2) {
    await prisma.eventAttendance.upsert({
      where: { esslLogId: "seed-att-2" },
      update: { deviceId: "DEV002" },
      create: {
        eventId: techFest.id,
        userId: student2.id,
        punchTime: new Date(eventStart.getTime() + 10 * 3600000),
        deviceId: "DEV002",
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
