import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateRefreshTokenValue,
  getRefreshExpiry,
} from "../utils/jwt";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid credentials format" });
  }

  const { userId, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { userId },
    include: { department: true },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid user ID or password" });
  }

  const payload = {
    sub: user.id,
    userId: user.userId,
    role: user.role,
    departmentId: user.departmentId,
  };

  const accessToken = signAccessToken(payload);
  const refreshTokenValue = generateRefreshTokenValue();

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: getRefreshExpiry(),
    },
  });

  return res.json({
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id: user.id,
      userId: user.userId,
      name: user.name,
      role: user.role,
      department: user.department,
    },
  });
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token required" });
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: { include: { department: true } } },
  });

  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  try {
    verifyRefreshToken(refreshToken);
  } catch {
    await prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => {});
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const user = stored.user;
  const payload = {
    sub: user.id,
    userId: user.userId,
    role: user.role,
    departmentId: user.departmentId,
  };

  const accessToken = signAccessToken(payload);
  return res.json({
    accessToken,
    user: {
      id: user.id,
      userId: user.userId,
      name: user.name,
      role: user.role,
      department: user.department,
    },
  });
});

router.post("/logout", authenticate, async (req: AuthRequest, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  return res.json({ message: "Logged out" });
});

router.get("/me", authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    include: { department: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json({
    id: user.id,
    userId: user.userId,
    name: user.name,
    role: user.role,
    department: user.department,
  });
});

export default router;
