import { Router } from "express";
import { customerSchema } from "@ai-assistant/shared";
import { prisma } from "../lib/prisma.js";
import { param } from "../lib/params.js";
import {
  indexCustomer,
  meili,
  CUSTOMERS_INDEX,
  removeCustomerFromIndex,
} from "../lib/meili.js";
import { writeAudit } from "../lib/audit.js";
import {
  authenticate,
  requirePermission,
  requireTenant,
} from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/error.js";

export const customersRouter = Router();

customersRouter.use(authenticate, requireTenant);

customersRouter.get(
  "/",
  requirePermission("customers:read"),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const tag = req.query.tag ? String(req.query.tag) : undefined;

    const where = {
      tenantId: req.user!.tenantId!,
      deletedAt: null,
      ...(tag ? { tags: { has: tag } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ items, total, page, limit });
  }),
);

customersRouter.get(
  "/search",
  requirePermission("customers:read"),
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "");
    if (!q) return res.json({ items: [] });

    try {
      const result = await meili.index(CUSTOMERS_INDEX).search(q, {
        filter: `tenantId = "${req.user!.tenantId}"`,
        limit: 20,
      });
      res.json({ items: result.hits });
    } catch {
      const items = await prisma.customer.findMany({
        where: {
          tenantId: req.user!.tenantId!,
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { vehiclePlate: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 20,
      });
      res.json({ items });
    }
  }),
);

customersRouter.get(
  "/:id",
  requirePermission("customers:read"),
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findFirst({
      where: {
        id: param(req, "id"),
        tenantId: req.user!.tenantId!,
        deletedAt: null,
      },
    });
    if (!customer) throw new AppError("Customer not found", 404);
    res.json(customer);
  }),
);

customersRouter.post(
  "/",
  requirePermission("customers:write"),
  asyncHandler(async (req, res) => {
    const body = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({
      data: {
        tenantId: req.user!.tenantId!,
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        vehiclePlate: body.vehiclePlate || null,
        vehicleBrand: body.vehicleBrand || null,
        vehicleModel: body.vehicleModel || null,
        vehicleYear: body.vehicleYear ?? null,
        notes: body.notes || null,
        tags: body.tags ?? [],
        lastActivityAt: new Date(),
      },
    });
    await indexCustomer(customer);
    res.status(201).json(customer);
  }),
);

customersRouter.patch(
  "/:id",
  requirePermission("customers:write"),
  asyncHandler(async (req, res) => {
    const body = customerSchema.partial().parse(req.body);
    const existing = await prisma.customer.findFirst({
      where: {
        id: param(req, "id"),
        tenantId: req.user!.tenantId!,
        deletedAt: null,
      },
    });
    if (!existing) throw new AppError("Customer not found", 404);

    const customer = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        ...body,
        email: body.email === "" ? null : body.email,
        lastActivityAt: new Date(),
      },
    });
    await indexCustomer(customer);
    res.json(customer);
  }),
);

customersRouter.delete(
  "/:id",
  requirePermission("customers:write"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.customer.findFirst({
      where: {
        id: param(req, "id"),
        tenantId: req.user!.tenantId!,
        deletedAt: null,
      },
    });
    if (!existing) throw new AppError("Customer not found", 404);

    await prisma.customer.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    await removeCustomerFromIndex(existing.id);
    await writeAudit({
      tenantId: req.user!.tenantId,
      userId: req.user!.id,
      action: "customer.delete",
      resource: existing.id,
      ip: req.ip,
    });
    res.status(204).send();
  }),
);
