import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getTrafficSummary } from "../lib/metrics.js";
import { writeAudit } from "../lib/audit.js";
import { authenticate, requirePlatformAdmin } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/error.js";
import { param } from "../lib/params.js";

export const adminRouter = Router();

adminRouter.use(authenticate, requirePlatformAdmin);

adminRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        isPlatformAdmin: true,
        createdAt: true,
      },
    });
    if (!user?.isPlatformAdmin) throw new AppError("Forbidden", 403);
    res.json({ user });
  }),
);

adminRouter.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const [
      tenants,
      users,
      customers,
      quotes,
      reminders,
      messages,
      activeTenants,
      recentAudits,
    ] = await Promise.all([
      prisma.tenant.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.quote.count(),
      prisma.reminder.count(),
      prisma.message.count(),
      prisma.tenant.count({
        where: {
          deletedAt: null,
          OR: [
            { customers: { some: { createdAt: { gte: daysAgo(30) } } } },
            { quotes: { some: { createdAt: { gte: daysAgo(30) } } } },
            { messages: { some: { createdAt: { gte: daysAgo(30) } } } },
          ],
        },
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { email: true, name: true } },
          tenant: { select: { name: true, slug: true } },
        },
      }),
    ]);

    const traffic = getTrafficSummary();

    res.json({
      counts: {
        tenants,
        activeTenants,
        users,
        customers,
        quotes,
        reminders,
        messages,
      },
      traffic: {
        uptimeSeconds: traffic.uptimeSeconds,
        totalRequests: traffic.totalRequests,
        totalErrors: traffic.totalErrors,
        errorRate: traffic.errorRate,
        lastHourRequests: traffic.lastHourRequests,
        lastHourErrors: traffic.lastHourErrors,
      },
      recentAudits,
    });
  }),
);

adminRouter.get(
  "/tenants",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const includeDeleted = req.query.includeDeleted === "true";
    const tenants = await prisma.tenant.findMany({
      where: {
        ...(includeDeleted ? {} : { deletedAt: null }),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            memberships: true,
            customers: true,
            quotes: true,
            messages: true,
          },
        },
      },
    });
    res.json({ tenants });
  }),
);

adminRouter.get(
  "/tenants/:id",
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                deletedAt: true,
                isPlatformAdmin: true,
              },
            },
          },
        },
        _count: {
          select: {
            customers: true,
            quotes: true,
            reminders: true,
            messages: true,
            reviews: true,
          },
        },
      },
    });
    if (!tenant) throw new AppError("Tenant not found", 404);
    res.json({ tenant });
  }),
);

adminRouter.patch(
  "/tenants/:id",
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const body = z
      .object({
        name: z.string().min(1).optional(),
        phone: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
      })
      .parse(req.body);

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
      },
    });

    await writeAudit({
      tenantId: tenant.id,
      userId: req.user!.id,
      action: "admin.tenant.update",
      resource: tenant.id,
      meta: body,
      ip: req.ip,
    });

    res.json({ tenant });
  }),
);

adminRouter.post(
  "/tenants/:id/disable",
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const tenant = await prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await writeAudit({
      tenantId: tenant.id,
      userId: req.user!.id,
      action: "admin.tenant.disable",
      resource: tenant.id,
      ip: req.ip,
    });
    res.json({ tenant });
  }),
);

adminRouter.post(
  "/tenants/:id/enable",
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const tenant = await prisma.tenant.update({
      where: { id },
      data: { deletedAt: null },
    });
    await writeAudit({
      tenantId: tenant.id,
      userId: req.user!.id,
      action: "admin.tenant.enable",
      resource: tenant.id,
      ip: req.ip,
    });
    res.json({ tenant });
  }),
);

adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const includeDeleted = req.query.includeDeleted === "true";
    const users = await prisma.user.findMany({
      where: {
        ...(includeDeleted ? {} : { deletedAt: null }),
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        isPlatformAdmin: true,
        createdAt: true,
        deletedAt: true,
        memberships: {
          include: {
            tenant: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    res.json({ users });
  }),
);

adminRouter.post(
  "/users/:id/disable",
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    if (id === req.user!.id) {
      throw new AppError("Cannot disable yourself", 400);
    }
    const user = await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await writeAudit({
      userId: req.user!.id,
      action: "admin.user.disable",
      resource: id,
      ip: req.ip,
    });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        deletedAt: user.deletedAt,
      },
    });
  }),
);

adminRouter.post(
  "/users/:id/enable",
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const user = await prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });
    await writeAudit({
      userId: req.user!.id,
      action: "admin.user.enable",
      resource: id,
      ip: req.ip,
    });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        deletedAt: user.deletedAt,
      },
    });
  }),
);

adminRouter.patch(
  "/users/:id/role",
  asyncHandler(async (req, res) => {
    const id = param(req, "id");
    const body = z
      .object({
        tenantId: z.string().min(1),
        role: z.enum([
          "Owner",
          "Manager",
          "Employee",
          "Accountant",
          "ReadOnly",
        ]),
      })
      .parse(req.body);

    const membership = await prisma.membership.upsert({
      where: {
        tenantId_userId: { tenantId: body.tenantId, userId: id },
      },
      update: { role: body.role },
      create: {
        tenantId: body.tenantId,
        userId: id,
        role: body.role,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });

    await writeAudit({
      tenantId: body.tenantId,
      userId: req.user!.id,
      action: "admin.membership.upsert",
      resource: membership.id,
      meta: body,
      ip: req.ip,
    });

    res.json({ membership });
  }),
);

adminRouter.get(
  "/audit",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const action = String(req.query.action || "").trim();
    const logs = await prisma.auditLog.findMany({
      where: action ? { action: { contains: action } } : undefined,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true } },
        tenant: { select: { name: true, slug: true } },
      },
    });
    res.json({ logs });
  }),
);

adminRouter.get(
  "/traffic",
  asyncHandler(async (_req, res) => {
    res.json(getTrafficSummary());
  }),
);

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
