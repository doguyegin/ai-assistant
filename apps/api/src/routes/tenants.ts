import { Router } from "express";
import { createTenantSchema, updateTenantSchema } from "@ai-assistant/shared";
import { prisma } from "../lib/prisma.js";
import { signAccessToken, signRefreshToken } from "../lib/jwt.js";
import { writeAudit } from "../lib/audit.js";
import {
  authenticate,
  requirePermission,
  requireTenant,
} from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/error.js";

export const tenantsRouter = Router();

tenantsRouter.use(authenticate);

tenantsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createTenantSchema.parse(req.body);
    const existing = await prisma.tenant.findUnique({ where: { slug: body.slug } });
    if (existing) throw new AppError("Slug already taken", 409);

    const existingMembership = await prisma.membership.findFirst({
      where: { userId: req.user!.id },
    });
    if (existingMembership) {
      throw new AppError("User already belongs to a tenant", 409);
    }

    const tenant = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          name: body.name,
          slug: body.slug,
          phone: body.phone,
          address: body.address,
        },
      });
      await tx.membership.create({
        data: {
          tenantId: t.id,
          userId: req.user!.id,
          role: "Owner",
        },
      });
      return t;
    });

    const refresh = await prisma.refreshToken.create({
      data: {
        token: "pending",
        userId: req.user!.id,
        tenantId: tenant.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const accessToken = signAccessToken({
      sub: req.user!.id,
      email: req.user!.email,
      tenantId: tenant.id,
      role: "Owner",
    });
    const refreshToken = signRefreshToken({
      sub: req.user!.id,
      tokenId: refresh.id,
    });
    await prisma.refreshToken.update({
      where: { id: refresh.id },
      data: { token: refreshToken },
    });

    await writeAudit({
      tenantId: tenant.id,
      userId: req.user!.id,
      action: "tenant.create",
      resource: tenant.id,
      ip: req.ip,
    });

    res.status(201).json({ tenant, accessToken, refreshToken, role: "Owner" });
  }),
);

tenantsRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    if (!req.user?.tenantId) {
      return res.json({ tenant: null, role: null });
    }
    const membership = await prisma.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: req.user.tenantId,
          userId: req.user.id,
        },
      },
      include: { tenant: true },
    });
    res.json({
      tenant: membership?.tenant ?? null,
      role: membership?.role ?? null,
    });
  }),
);

tenantsRouter.patch(
  "/me",
  requireTenant,
  requirePermission("tenant:write"),
  asyncHandler(async (req, res) => {
    const body = updateTenantSchema.parse(req.body);
    const tenant = await prisma.tenant.update({
      where: { id: req.user!.tenantId! },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.phone !== undefined
          ? { phone: body.phone === "" ? null : body.phone }
          : {}),
        ...(body.address !== undefined
          ? { address: body.address === "" ? null : body.address }
          : {}),
        ...(body.logoUrl !== undefined
          ? { logoUrl: body.logoUrl === "" ? null : body.logoUrl }
          : {}),
      },
    });

    await writeAudit({
      tenantId: tenant.id,
      userId: req.user!.id,
      action: "tenant.update",
      resource: tenant.id,
      ip: req.ip,
    });

    res.json({ tenant });
  }),
);
