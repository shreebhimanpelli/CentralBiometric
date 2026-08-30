import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { canManageEvents, canViewStudentAttendance } from "../utils/permissions";

const router = Router();

const eventSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  departmentId: z.string().optional(),
  coordinatorIds: z.array(z.string()).optional(),
});

router.get("/", authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;

  if (user.role === Role.STUDENT || user.role === Role.STAFF) {
    const events = await prisma.event.findMany({
      where: user.departmentId ? { departmentId: user.departmentId } : undefined,
      include: { department: true, coordinators: { include: { user: { select: { name: true, userId: true } } } } },
      orderBy: { startTime: "desc" },
      take: 50,
    });
    return res.json(events);
  }

  if (user.role === Role.HOD && user.departmentId) {
    const events = await prisma.event.findMany({
      where: { departmentId: user.departmentId },
      include: {
        department: true,
        coordinators: { include: { user: { select: { name: true, userId: true } } } },
        _count: { select: { attendance: true } },
      },
      orderBy: { startTime: "desc" },
    });
    return res.json(events);
  }

  if (user.role === Role.EVENT_COORDINATOR) {
    const events = await prisma.event.findMany({
      where: { coordinators: { some: { userId: user.sub } } },
      include: {
        department: true,
        coordinators: { include: { user: { select: { name: true, userId: true } } } },
        _count: { select: { attendance: true } },
      },
      orderBy: { startTime: "desc" },
    });
    return res.json(events);
  }

  const events = await prisma.event.findMany({
    include: {
      department: true,
      coordinators: { include: { user: { select: { name: true, userId: true } } } },
      _count: { select: { attendance: true } },
    },
    orderBy: { startTime: "desc" },
  });
  return res.json(events);
});

router.post("/", authenticate, async (req: AuthRequest, res) => {
  if (!canManageEvents(req.user!)) {
    return res.status(403).json({ error: "Cannot create events" });
  }

  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { name, description, startTime, endTime, departmentId, coordinatorIds } = parsed.data;
  const deptId = departmentId || req.user!.departmentId;

  if (!deptId) {
    return res.status(400).json({ error: "Department required" });
  }

  const event = await prisma.event.create({
    data: {
      name,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      departmentId: deptId,
      coordinators: {
        create: (coordinatorIds || [req.user!.sub]).map((uid) => ({ userId: uid })),
      },
    },
    include: {
      department: true,
      coordinators: { include: { user: { select: { name: true, userId: true } } } },
    },
  });

  return res.status(201).json(event);
});

router.get("/:id/attendance", authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;
  const eventId = String(req.params.id);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { coordinators: true },
  });

  if (!event) return res.status(404).json({ error: "Event not found" });

  if (user.role === Role.STUDENT) {
    const attendance = await prisma.eventAttendance.findMany({
      where: { eventId, userId: user.sub },
      include: { user: { select: { userId: true, name: true } } },
      orderBy: { punchTime: "desc" },
    });
    return res.json(attendance);
  }

  if (!canViewStudentAttendance(user)) {
    return res.status(403).json({ error: "No access to event attendance" });
  }

  if (user.role === Role.HOD && event.departmentId !== user.departmentId) {
    return res.status(403).json({ error: "No access to this event" });
  }

  if (
    user.role === Role.EVENT_COORDINATOR &&
    !event.coordinators.some((c) => c.userId === user.sub)
  ) {
    return res.status(403).json({ error: "Not assigned to this event" });
  }

  const attendance = await prisma.eventAttendance.findMany({
    where: { eventId },
    include: { user: { select: { userId: true, name: true } } },
    orderBy: { punchTime: "desc" },
  });

  return res.json(attendance);
});

router.post("/:id/attendance", authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;
  const eventId = String(req.params.id);

  if (!canManageEvents(user)) {
    return res.status(403).json({ error: "Cannot record attendance" });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { coordinators: true },
  });

  if (!event) return res.status(404).json({ error: "Event not found" });

  if (
    user.role === Role.EVENT_COORDINATOR &&
    !event.coordinators.some((c) => c.userId === user.sub)
  ) {
    return res.status(403).json({ error: "Not assigned to this event" });
  }

  const schema = z.object({
    userId: z.string(),
    punchTime: z.string().datetime().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const targetUser = await prisma.user.findUnique({ where: { userId: parsed.data.userId } });
  if (!targetUser) return res.status(404).json({ error: "User not found" });

  const record = await prisma.eventAttendance.create({
    data: {
      eventId,
      userId: targetUser.id,
      punchTime: parsed.data.punchTime ? new Date(parsed.data.punchTime) : new Date(),
    },
    include: { user: { select: { userId: true, name: true } } },
  });

  return res.status(201).json(record);
});

export default router;
