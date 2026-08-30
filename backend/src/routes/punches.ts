import { Router } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { canViewStaffPunches } from "../utils/permissions";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;
  const { from, to, userId: filterUserId } = req.query;

  if (user.role === Role.STAFF) {
    const punches = await prisma.punchLog.findMany({
      where: {
        userId: user.sub,
        ...(from || to
          ? {
              punchTime: {
                ...(from ? { gte: new Date(from as string) } : {}),
                ...(to ? { lte: new Date(to as string) } : {}),
              },
            }
          : {}),
      },
      include: { user: { select: { userId: true, name: true } } },
      orderBy: { punchTime: "desc" },
      take: 200,
    });
    return res.json(punches);
  }

  if (!canViewStaffPunches(user)) {
    return res.status(403).json({ error: "No access to staff punches" });
  }

  const where: Record<string, unknown> = {};

  if (user.role === Role.HOD && user.departmentId) {
    where.user = { departmentId: user.departmentId, role: { in: [Role.STAFF, Role.HOD] } };
  }

  if (filterUserId) {
    where.user = { ...(where.user as object), userId: filterUserId };
  }

  if (from || to) {
    where.punchTime = {
      ...(from ? { gte: new Date(from as string) } : {}),
      ...(to ? { lte: new Date(to as string) } : {}),
    };
  }

  const punches = await prisma.punchLog.findMany({
    where,
    include: {
      user: {
        select: { userId: true, name: true, role: true, department: { select: { name: true, code: true } } },
      },
    },
    orderBy: { punchTime: "desc" },
    take: 500,
  });

  return res.json(punches);
});

router.get("/summary", authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (user.role === Role.STAFF) {
    const todayPunches = await prisma.punchLog.count({
      where: { userId: user.sub, punchTime: { gte: today, lt: tomorrow } },
    });
    const totalPunches = await prisma.punchLog.count({ where: { userId: user.sub } });
    return res.json({ todayPunches, totalPunches });
  }

  if (!canViewStaffPunches(user)) {
    return res.status(403).json({ error: "No access" });
  }

  const deptFilter =
    user.role === Role.HOD && user.departmentId
      ? { departmentId: user.departmentId, role: { in: [Role.STAFF, Role.HOD] as Role[] } }
      : { role: { in: [Role.STAFF, Role.HOD] as Role[] } };

  const todayPunches = await prisma.punchLog.count({
    where: {
      punchTime: { gte: today, lt: tomorrow },
      user: deptFilter,
    },
  });

  const staffCount = await prisma.user.count({ where: deptFilter });
  const totalPunches = await prisma.punchLog.count({ where: { user: deptFilter } });

  return res.json({ todayPunches, staffCount, totalPunches });
});

export default router;
