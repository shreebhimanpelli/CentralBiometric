import { Router, Response } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { canManageEvents, canViewStudentAttendance } from "../utils/permissions";

const router = Router();

const eventSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  venue: z.string().optional(),
  deviceId: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  departmentId: z.string().optional(),
  coordinatorIds: z.array(z.string()).optional(),
  batch: z.string().optional(),
});

const enrollmentSchema = z.object({
  batch: z.string().optional(),
  userIds: z.array(z.string()).optional(),
});

const eventInclude = {
  department: true,
  coordinators: { include: { user: { select: { name: true, userId: true } } } },
  _count: { select: { attendance: true, enrollments: true } },
} as const;

async function loadEvent(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    include: { coordinators: true, department: true },
  });
}

function canAccessEvent(
  user: NonNullable<AuthRequest["user"]>,
  event: { departmentId: string; coordinators: { userId: string }[] }
) {
  if (user.role === Role.ADMIN) return true;
  if (user.role === Role.HOD && user.departmentId === event.departmentId) return true;
  if (
    user.role === Role.EVENT_COORDINATOR &&
    event.coordinators.some((c) => c.userId === user.sub)
  ) {
    return true;
  }
  if (user.role === Role.STUDENT && user.departmentId === event.departmentId) return true;
  return false;
}

function canManageEvent(
  user: NonNullable<AuthRequest["user"]>,
  event: { coordinators: { userId: string }[] }
) {
  if (!canManageEvents(user)) return false;
  if (user.role === Role.ADMIN) return true;
  return event.coordinators.some((c) => c.userId === user.sub);
}

async function enrollStudentsByBatch(eventId: string, departmentId: string, batch: string) {
  const students = await prisma.user.findMany({
    where: { role: Role.STUDENT, departmentId, batch },
    select: { id: true, batch: true },
  });

  if (students.length === 0) return 0;

  await prisma.eventEnrollment.createMany({
    data: students.map((s) => ({
      eventId,
      userId: s.id,
      batch: s.batch,
    })),
    skipDuplicates: true,
  });

  return students.length;
}

async function enrollStudentsByUserIds(eventId: string, userIds: string[]) {
  const students = await prisma.user.findMany({
    where: { role: Role.STUDENT, userId: { in: userIds } },
    select: { id: true, batch: true },
  });

  if (students.length === 0) return 0;

  await prisma.eventEnrollment.createMany({
    data: students.map((s) => ({
      eventId,
      userId: s.id,
      batch: s.batch,
    })),
    skipDuplicates: true,
  });

  return students.length;
}

async function buildRoster(eventId: string, deviceId?: string) {
  const enrollments = await prisma.eventEnrollment.findMany({
    where: { eventId },
    include: {
      user: {
        select: { userId: true, name: true, batch: true },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  const attendance = await prisma.eventAttendance.findMany({
    where: { eventId },
    orderBy: { punchTime: "asc" },
  });

  const attendanceByUser = new Map<string, (typeof attendance)[number][]>();
  for (const record of attendance) {
    const list = attendanceByUser.get(record.userId) ?? [];
    list.push(record);
    attendanceByUser.set(record.userId, list);
  }

  return enrollments.map((enrollment) => {
    const records = attendanceByUser.get(enrollment.userId) ?? [];
    const match = deviceId
      ? records.find((r) => r.deviceId === deviceId)
      : records[0];

    return {
      userId: enrollment.user.userId,
      name: enrollment.user.name,
      batch: enrollment.user.batch ?? enrollment.batch,
      status: match ? ("present" as const) : ("absent" as const),
      punchTime: match?.punchTime ?? null,
      deviceId: match?.deviceId ?? null,
    };
  });
}

function rosterToCsv(
  rows: Awaited<ReturnType<typeof buildRoster>>,
  meta: { eventName: string; venue: string | null; deviceId: string | null }
) {
  const header = ["Event", "Venue", "Event Device", "Student ID", "Name", "Batch", "Status", "Punch Time", "Punch Device"];
  const lines = rows.map((r) => [
    meta.eventName,
    meta.venue ?? "",
    meta.deviceId ?? "",
    r.userId,
    r.name,
    r.batch ?? "",
    r.status,
    r.punchTime ? new Date(r.punchTime).toISOString() : "",
    r.deviceId ?? "",
  ]);

  return [header, ...lines]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

router.get("/", authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;
  const filterDepartmentId = req.query.departmentId as string | undefined;

  if (user.role === Role.STUDENT || user.role === Role.STAFF) {
    const events = await prisma.event.findMany({
      where: user.departmentId ? { departmentId: user.departmentId } : undefined,
      include: eventInclude,
      orderBy: { startTime: "desc" },
      take: 50,
    });
    return res.json(events);
  }

  if (user.role === Role.HOD && user.departmentId) {
    const events = await prisma.event.findMany({
      where: { departmentId: user.departmentId },
      include: eventInclude,
      orderBy: { startTime: "desc" },
    });
    return res.json(events);
  }

  if (user.role === Role.EVENT_COORDINATOR) {
    const events = await prisma.event.findMany({
      where: {
        coordinators: { some: { userId: user.sub } },
        ...(filterDepartmentId ? { departmentId: filterDepartmentId } : {}),
      },
      include: eventInclude,
      orderBy: { startTime: "desc" },
    });
    return res.json(events);
  }

  const events = await prisma.event.findMany({
    where: filterDepartmentId ? { departmentId: filterDepartmentId } : undefined,
    include: eventInclude,
    orderBy: { startTime: "desc" },
  });
  return res.json(events);
});

router.get("/devices", authenticate, async (_req, res) => {
  const rows = await prisma.punchLog.findMany({
    where: { deviceId: { not: null } },
    distinct: ["deviceId"],
    select: { deviceId: true },
    orderBy: { deviceId: "asc" },
  });
  return res.json(rows.map((r) => r.deviceId).filter(Boolean));
});

router.get("/batches", authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;
  const departmentId = (req.query.departmentId as string) || user.departmentId;

  const where: { role: Role; batch: { not: null }; departmentId?: string } = {
    role: Role.STUDENT,
    batch: { not: null },
  };
  if (departmentId) where.departmentId = departmentId;

  const rows = await prisma.user.findMany({
    where,
    distinct: ["batch"],
    select: { batch: true },
    orderBy: { batch: "asc" },
  });

  return res.json(rows.map((r) => r.batch).filter(Boolean));
});

router.get("/:id", authenticate, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({
    where: { id: String(req.params.id) },
    include: eventInclude,
  });

  if (!event) return res.status(404).json({ error: "Event not found" });
  if (!canAccessEvent(req.user!, event)) {
    return res.status(403).json({ error: "No access to this event" });
  }

  return res.json(event);
});

router.post("/", authenticate, async (req: AuthRequest, res) => {
  if (!canManageEvents(req.user!)) {
    return res.status(403).json({ error: "Cannot create events" });
  }

  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { name, description, venue, deviceId, startTime, endTime, departmentId, coordinatorIds, batch } =
    parsed.data;
  const deptId = departmentId || req.user!.departmentId;

  if (!deptId) {
    return res.status(400).json({ error: "Department required" });
  }

  const event = await prisma.event.create({
    data: {
      name,
      description,
      venue,
      deviceId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      departmentId: deptId,
      coordinators: {
        create: (coordinatorIds || [req.user!.sub]).map((uid) => ({ userId: uid })),
      },
    },
    include: eventInclude,
  });

  if (batch) {
    await enrollStudentsByBatch(event.id, deptId, batch);
  }

  const refreshed = await prisma.event.findUnique({
    where: { id: event.id },
    include: eventInclude,
  });

  return res.status(201).json(refreshed);
});

router.post("/:id/enrollments", authenticate, async (req: AuthRequest, res) => {
  const eventId = String(req.params.id);
  const event = await loadEvent(eventId);

  if (!event) return res.status(404).json({ error: "Event not found" });
  if (!canManageEvent(req.user!, event)) {
    return res.status(403).json({ error: "Cannot manage enrollments" });
  }

  const parsed = enrollmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { batch, userIds } = parsed.data;
  if (!batch && (!userIds || userIds.length === 0)) {
    return res.status(400).json({ error: "Provide batch or userIds" });
  }

  const count = batch
    ? await enrollStudentsByBatch(eventId, event.departmentId, batch)
    : await enrollStudentsByUserIds(eventId, userIds!);

  return res.status(201).json({ enrolled: count });
});

router.get("/:id/roster", authenticate, async (req: AuthRequest, res) => {
  const eventId = String(req.params.id);
  const deviceId = req.query.deviceId as string | undefined;
  const event = await loadEvent(eventId);

  if (!event) return res.status(404).json({ error: "Event not found" });
  if (!canViewStudentAttendance(req.user!)) {
    return res.status(403).json({ error: "No access to event roster" });
  }
  if (!canAccessEvent(req.user!, event)) {
    return res.status(403).json({ error: "No access to this event" });
  }

  const roster = await buildRoster(eventId, deviceId);
  const present = roster.filter((r) => r.status === "present").length;

  return res.json({
    event: {
      id: event.id,
      name: event.name,
      venue: event.venue,
      deviceId: event.deviceId,
      department: {
        id: event.department.id,
        name: event.department.name,
        code: event.department.code,
      },
      startTime: event.startTime,
      endTime: event.endTime,
    },
    summary: {
      enrolled: roster.length,
      present,
      absent: roster.length - present,
    },
    roster,
  });
});

router.get("/:id/roster/export", authenticate, async (req: AuthRequest, res: Response) => {
  const eventId = String(req.params.id);
  const deviceId = req.query.deviceId as string | undefined;
  const event = await loadEvent(eventId);

  if (!event) return res.status(404).json({ error: "Event not found" });
  if (!canViewStudentAttendance(req.user!)) {
    return res.status(403).json({ error: "No access to export roster" });
  }
  if (!canAccessEvent(req.user!, event)) {
    return res.status(403).json({ error: "No access to this event" });
  }

  const roster = await buildRoster(eventId, deviceId);
  const csv = rosterToCsv(roster, {
    eventName: event.name,
    venue: event.venue,
    deviceId: event.deviceId,
  });

  const suffix = deviceId ? `-${deviceId}` : "";
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="event-${event.id}${suffix}-roster.csv"`);
  return res.send(csv);
});

router.get("/:id/attendance", authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;
  const eventId = String(req.params.id);
  const event = await loadEvent(eventId);

  if (!event) return res.status(404).json({ error: "Event not found" });

  if (user.role === Role.STUDENT) {
    const attendance = await prisma.eventAttendance.findMany({
      where: { eventId, userId: user.sub },
      include: { user: { select: { userId: true, name: true, batch: true } } },
      orderBy: { punchTime: "desc" },
    });
    return res.json(attendance);
  }

  if (!canViewStudentAttendance(user)) {
    return res.status(403).json({ error: "No access to event attendance" });
  }
  if (!canAccessEvent(user, event)) {
    return res.status(403).json({ error: "No access to this event" });
  }

  const deviceId = req.query.deviceId as string | undefined;
  const attendance = await prisma.eventAttendance.findMany({
    where: {
      eventId,
      ...(deviceId ? { deviceId } : {}),
    },
    include: { user: { select: { userId: true, name: true, batch: true } } },
    orderBy: { punchTime: "desc" },
  });

  return res.json(attendance);
});

router.post("/:id/attendance", authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;
  const eventId = String(req.params.id);
  const event = await loadEvent(eventId);

  if (!event) return res.status(404).json({ error: "Event not found" });
  if (!canManageEvent(user, event)) {
    return res.status(403).json({ error: "Cannot record attendance" });
  }

  const schema = z.object({
    userId: z.string(),
    punchTime: z.string().datetime().optional(),
    deviceId: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const targetUser = await prisma.user.findUnique({ where: { userId: parsed.data.userId } });
  if (!targetUser) return res.status(404).json({ error: "User not found" });

  await prisma.eventEnrollment.upsert({
    where: { eventId_userId: { eventId, userId: targetUser.id } },
    update: {},
    create: {
      eventId,
      userId: targetUser.id,
      batch: targetUser.batch,
    },
  });

  const record = await prisma.eventAttendance.create({
    data: {
      eventId,
      userId: targetUser.id,
      punchTime: parsed.data.punchTime ? new Date(parsed.data.punchTime) : new Date(),
      deviceId: parsed.data.deviceId || event.deviceId || null,
    },
    include: { user: { select: { userId: true, name: true, batch: true } } },
  });

  return res.status(201).json(record);
});

export default router;
