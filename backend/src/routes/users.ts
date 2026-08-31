import { Router } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest, requireRoles } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, requireRoles(Role.ADMIN, Role.HOD), async (req: AuthRequest, res) => {
  const user = req.user!;
  const where =
    user.role === Role.HOD && user.departmentId ? { departmentId: user.departmentId } : {};

  const users = await prisma.user.findMany({
    where,
      select: {
      id: true,
      userId: true,
      name: true,
      role: true,
      batch: true,
      department: { select: { name: true, code: true } },
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return res.json(users);
});

export default router;
