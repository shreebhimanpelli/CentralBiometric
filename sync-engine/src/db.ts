import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

export interface EsslLog {
  DeviceLogId: string;
  UserId: string;
  LogDate: Date;
  DeviceId: string;
  Direction?: string;
}

export async function getSyncCursor() {
  return prisma.syncCursor.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

export async function updateSyncCursor(lastSyncedAt: Date, lastEsslId: string) {
  return prisma.syncCursor.update({
    where: { id: "default" },
    data: { lastSyncedAt, lastEsslId },
  });
}

export async function processEsslLogs(logs: EsslLog[]): Promise<number> {
  let processed = 0;

  for (const log of logs) {
    const esslLogId = String(log.DeviceLogId);
    const existing = await prisma.punchLog.findUnique({ where: { esslLogId } });
    if (existing) continue;

    const user = await prisma.user.findUnique({ where: { userId: log.UserId } });
    if (!user) {
      console.warn(`Unknown user ID from eSSL: ${log.UserId}`);
      continue;
    }

    const punchTime = new Date(log.LogDate);

    if (user.role === Role.STUDENT) {
      const activeEvent = await prisma.event.findFirst({
        where: {
          departmentId: user.departmentId || undefined,
          startTime: { lte: punchTime },
          endTime: { gte: punchTime },
        },
        orderBy: { startTime: "desc" },
      });

      if (activeEvent) {
        const existingAtt = await prisma.eventAttendance.findUnique({ where: { esslLogId } });
        if (!existingAtt) {
          await prisma.eventAttendance.create({
            data: {
              eventId: activeEvent.id,
              userId: user.id,
              punchTime,
              esslLogId,
            },
          });
        }
      }
    } else if ([Role.STAFF, Role.HOD, Role.EVENT_COORDINATOR, Role.ADMIN].includes(user.role)) {
      await prisma.punchLog.create({
        data: {
          userId: user.id,
          punchTime,
          deviceId: log.DeviceId || null,
          direction: log.Direction || null,
          esslLogId,
        },
      });
    }

    processed++;
  }

  return processed;
}

export { prisma };
