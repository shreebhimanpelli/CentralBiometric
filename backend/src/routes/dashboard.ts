import { Router } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/stats", authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;

  if (user.role === Role.STUDENT) {
    const myAttendance = await prisma.eventAttendance.count({ where: { userId: user.sub } });
    const upcomingEvents = await prisma.event.count({
      where: {
        departmentId: user.departmentId || undefined,
        endTime: { gte: new Date() },
      },
    });
    return res.json({ myAttendance, upcomingEvents });
  }

  if (user.role === Role.STAFF) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayPunches = await prisma.punchLog.count({
      where: { userId: user.sub, punchTime: { gte: today, lt: tomorrow } },
    });
    return res.json({ todayPunches });
  }

  if (user.role === Role.EVENT_COORDINATOR) {
    const myEvents = await prisma.event.count({
      where: { coordinators: { some: { userId: user.sub } } },
    });
    const activeEvents = await prisma.event.count({
      where: {
        coordinators: { some: { userId: user.sub } },
        startTime: { lte: new Date() },
        endTime: { gte: new Date() },
      },
    });
    return res.json({ myEvents, activeEvents });
  }

  const deptFilter =
    user.role === Role.HOD && user.departmentId ? { departmentId: user.departmentId } : {};

  const [staffCount, studentCount, eventCount, todayPunches] = await Promise.all([
    prisma.user.count({ where: { ...deptFilter, role: { in: [Role.STAFF, Role.HOD] } } }),
    prisma.user.count({ where: { ...deptFilter, role: Role.STUDENT } }),
    prisma.event.count({ where: deptFilter }),
    prisma.punchLog.count({
      where: {
        punchTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        user: deptFilter.departmentId
          ? { departmentId: deptFilter.departmentId }
          : { role: { in: [Role.STAFF, Role.HOD] } },
      },
    }),
  ]);

  return res.json({ staffCount, studentCount, eventCount, todayPunches });
});

export default router;
