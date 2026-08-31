import { Router } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { canViewStaffPunches } from "../utils/permissions";
import { parseDeviceIds } from "../utils/devices";

const router = Router();

type PunchRecord = {
  id: string;
  recordType: "staff" | "event";
  punchTime: Date;
  direction: string | null;
  deviceId: string | null;
  department: { code: string; name: string } | null;
  event: { id: string; name: string } | null;
  user: { userId: string; name: string; role?: string };
};

function formatStaffRecord(
  punch: {
    id: string;
    punchTime: Date;
    direction: string | null;
    deviceId: string | null;
    user: {
      userId: string;
      name: string;
      role?: string;
      department: { code: string; name: string } | null;
    };
  }
): PunchRecord {
  return {
    id: punch.id,
    recordType: "staff",
    punchTime: punch.punchTime,
    direction: punch.direction,
    deviceId: punch.deviceId,
    department: punch.user.department,
    event: null,
    user: {
      userId: punch.user.userId,
      name: punch.user.name,
      role: punch.user.role,
    },
  };
}

function formatEventRecord(
  record: {
    id: string;
    punchTime: Date;
    deviceId: string | null;
    user: { userId: string; name: string; role?: string };
    event: {
      id: string;
      name: string;
      department: { code: string; name: string };
    };
  }
): PunchRecord {
  return {
    id: record.id,
    recordType: "event",
    punchTime: record.punchTime,
    direction: "IN",
    deviceId: record.deviceId,
    department: record.event.department,
    event: { id: record.event.id, name: record.event.name },
    user: {
      userId: record.user.userId,
      name: record.user.name,
      role: record.user.role,
    },
  };
}

function resolveDepartmentId(user: NonNullable<AuthRequest["user"]>, requested?: string) {
  if (user.role === Role.HOD && user.departmentId) return user.departmentId;
  return requested || undefined;
}

router.get("/", authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;
  const {
    from,
    to,
    userId: filterUserId,
    departmentId: requestedDepartmentId,
    deviceId,
    eventId,
  } = req.query;

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
      include: {
        user: {
          select: {
            userId: true,
            name: true,
            department: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { punchTime: "desc" },
      take: 200,
    });
    return res.json(punches.map((p) => formatStaffRecord({ ...p, user: { ...p.user, role: "STAFF" } })));
  }

  if (!canViewStaffPunches(user)) {
    return res.status(403).json({ error: "No access to punch records" });
  }

  const departmentId = resolveDepartmentId(user, requestedDepartmentId as string | undefined);
  const timeFilter =
    from || to
      ? {
          punchTime: {
            ...(from ? { gte: new Date(from as string) } : {}),
            ...(to ? { lte: new Date(to as string) } : {}),
          },
        }
      : {};

  if (eventId) {
    const event = await prisma.event.findUnique({
      where: { id: String(eventId) },
      include: { department: true },
    });

    if (!event) return res.status(404).json({ error: "Event not found" });
    if (departmentId && event.departmentId !== departmentId) {
      return res.status(400).json({ error: "Event does not belong to the selected department" });
    }
    if (user.role === Role.HOD && user.departmentId && event.departmentId !== user.departmentId) {
      return res.status(403).json({ error: "No access to this event" });
    }

    const attendance = await prisma.eventAttendance.findMany({
      where: {
        eventId: String(eventId),
        ...(deviceId ? { deviceId: String(deviceId) } : {}),
        ...timeFilter,
      },
      include: {
        user: { select: { userId: true, name: true, role: true } },
        event: {
          select: {
            id: true,
            name: true,
            department: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { punchTime: "desc" },
      take: 500,
    });

    return res.json(attendance.map(formatEventRecord));
  }

  const userWhere: Record<string, unknown> = { role: { in: [Role.STAFF, Role.HOD] } };
  if (departmentId) userWhere.departmentId = departmentId;
  if (filterUserId) userWhere.userId = filterUserId;

  const punches = await prisma.punchLog.findMany({
    where: {
      ...(deviceId ? { deviceId: String(deviceId) } : {}),
      ...timeFilter,
      user: userWhere,
    },
    include: {
      user: {
        select: {
          userId: true,
          name: true,
          role: true,
          department: { select: { name: true, code: true } },
        },
      },
    },
    orderBy: { punchTime: "desc" },
    take: 500,
  });

  return res.json(punches.map(formatStaffRecord));
});

router.get("/devices", authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;

  if (!canViewStaffPunches(user)) {
    return res.status(403).json({ error: "No access" });
  }

  const departmentId = resolveDepartmentId(user, req.query.departmentId as string | undefined);
  const eventId = req.query.eventId as string | undefined;
  const devices = new Set<string>();

  if (eventId) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    parseDeviceIds(event?.deviceIds).forEach((id) => devices.add(id));

    const rows = await prisma.eventAttendance.findMany({
      where: { eventId, deviceId: { not: null } },
      distinct: ["deviceId"],
      select: { deviceId: true },
    });
    rows.forEach((r) => r.deviceId && devices.add(r.deviceId));

    return res.json([...devices].sort());
  }

  const staffWhere: Record<string, unknown> = {
    deviceId: { not: null },
    user: { role: { in: [Role.STAFF, Role.HOD] } },
  };
  if (departmentId) {
    (staffWhere.user as Record<string, unknown>).departmentId = departmentId;
  } else if (user.role === Role.HOD && user.departmentId) {
    (staffWhere.user as Record<string, unknown>).departmentId = user.departmentId;
  }

  const staffDevices = await prisma.punchLog.findMany({
    where: staffWhere,
    distinct: ["deviceId"],
    select: { deviceId: true },
  });
  staffDevices.forEach((r) => r.deviceId && devices.add(r.deviceId));

  if (departmentId) {
    const deptEvents = await prisma.event.findMany({
      where: { departmentId },
      select: { deviceIds: true },
    });
    deptEvents.forEach((row) => {
      parseDeviceIds(row.deviceIds).forEach((id) => devices.add(id));
    });
  }

  return res.json([...devices].sort());
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
