import { Router } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { loginSchema, refreshSchema, registerSchema } from "@ai-assistant/shared";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt.js";
import { writeAudit } from "../lib/audit.js";
import { asyncHandler, AppError } from "../middleware/error.js";
import type { Role } from "@ai-assistant/shared";

export const authRouter = Router();

const googleClient =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? new OAuth2Client(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_CALLBACK_URL,
      )
    : null;

async function issueTokens(user: {
  id: string;
  email: string;
}, tenantId: string | null, role: Role | null) {
  const refresh = await prisma.refreshToken.create({
    data: {
      token: cryptoRandom(),
      userId: user.id,
      tenantId: tenantId ?? undefined,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    tenantId,
    role,
  });
  const refreshToken = signRefreshToken({
    sub: user.id,
    tokenId: refresh.id,
  });

  await prisma.refreshToken.update({
    where: { id: refresh.id },
    data: { token: refreshToken },
  });

  return { accessToken, refreshToken };
}

function cryptoRandom() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function primaryMembership(userId: string) {
  return prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new AppError("Email already registered", 409);

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name,
        passwordHash,
      },
    });

    const tokens = await issueTokens(user, null, null);
    await writeAudit({
      userId: user.id,
      action: "auth.register",
      ip: req.ip,
    });

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens,
    });
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!user?.passwordHash) throw new AppError("Invalid credentials", 401);

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw new AppError("Invalid credentials", 401);

    const membership = await primaryMembership(user.id);
    const tokens = await issueTokens(
      user,
      membership?.tenantId ?? null,
      (membership?.role as Role) ?? null,
    );

    await writeAudit({
      userId: user.id,
      tenantId: membership?.tenantId,
      action: "auth.login",
      ip: req.ip,
    });

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      tenantId: membership?.tenantId ?? null,
      role: membership?.role ?? null,
      ...tokens,
    });
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const body = refreshSchema.parse(req.body);
    let payload;
    try {
      payload = verifyRefreshToken(body.refreshToken);
    } catch {
      throw new AppError("Invalid refresh token", 401);
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { id: payload.tokenId },
    });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      stored.token !== body.refreshToken
    ) {
      throw new AppError("Refresh token revoked or expired", 401);
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    const membership = await primaryMembership(user.id);
    const tokens = await issueTokens(
      user,
      membership?.tenantId ?? null,
      (membership?.role as Role) ?? null,
    );

    res.json(tokens);
  }),
);

authRouter.get("/providers", (_req, res) => {
  res.json({
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  });
});

authRouter.get("/google", (_req, res) => {
  if (!googleClient || !env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({
      error: "Google OAuth not configured",
      mock: true,
    });
  }
  const url = googleClient.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "consent",
  });
  res.json({ url });
});

authRouter.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    if (!googleClient) throw new AppError("Google OAuth not configured", 503);
    const code = String(req.query.code || "");
    if (!code) throw new AppError("Missing code", 400);

    const { tokens } = await googleClient.getToken(code);
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) throw new AppError("Google account has no email", 400);

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: payload.email.toLowerCase(),
          name: payload.name || payload.email,
          googleId: payload.sub,
          avatarUrl: payload.picture,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub, avatarUrl: payload.picture },
      });
    }

    const membership = await primaryMembership(user.id);
    const authTokens = await issueTokens(
      user,
      membership?.tenantId ?? null,
      (membership?.role as Role) ?? null,
    );

    await writeAudit({
      userId: user.id,
      tenantId: membership?.tenantId,
      action: "auth.google",
      ip: req.ip,
    });

    const redirect = new URL("/auth/callback", env.WEB_URL);
    redirect.searchParams.set("accessToken", authTokens.accessToken);
    redirect.searchParams.set("refreshToken", authTokens.refreshToken);
    res.redirect(redirect.toString());
  }),
);

/** Dev-only mock Google login when OAuth is not configured */
authRouter.post(
  "/google/mock",
  asyncHandler(async (req, res) => {
    if (env.NODE_ENV === "production" && env.GOOGLE_CLIENT_ID) {
      throw new AppError("Not available", 404);
    }
    const email = String(req.body.email || "demo@example.com").toLowerCase();
    const name = String(req.body.name || "Demo User");

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, name, googleId: `mock-${email}` },
      });
    }
    const membership = await primaryMembership(user.id);
    const tokens = await issueTokens(
      user,
      membership?.tenantId ?? null,
      (membership?.role as Role) ?? null,
    );
    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      tenantId: membership?.tenantId ?? null,
      role: membership?.role ?? null,
      ...tokens,
    });
  }),
);
