import { Router } from "express";
import { reminderSchema } from "@ai-assistant/shared";
import { prisma } from "../lib/prisma.js";
import { param } from "../lib/params.js";
import { scheduleReminderJob } from "../queues/index.js";
import {
  authenticate,
  requirePermission,
  requireTenant,
} from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/error.js";

export const remindersRouter = Router();

remindersRouter.use(authenticate, requireTenant);

remindersRouter.get(
  "/",
  requirePermission("reminders:read"),
  asyncHandler(async (req, res) => {
    const items = await prisma.reminder.findMany({
      where: { tenantId: req.user!.tenantId! },
      include: { customer: { select: { id: true, name: true, phone: true } } },
      orderBy: { dueAt: "asc" },
      take: 100,
    });
    res.json({ items });
  }),
);

remindersRouter.post(
  "/",
  requirePermission("reminders:write"),
  asyncHandler(async (req, res) => {
    const body = reminderSchema.parse(req.body);
    if (body.customerId) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: body.customerId,
          tenantId: req.user!.tenantId!,
          deletedAt: null,
        },
      });
      if (!customer) throw new AppError("Customer not found", 404);
    }

    const reminder = await prisma.reminder.create({
      data: {
        tenantId: req.user!.tenantId!,
        customerId: body.customerId || null,
        title: body.title,
        type: body.type,
        dueAt: new Date(body.dueAt),
        channel: body.channel,
        notes: body.notes || null,
      },
    });

    try {
      await scheduleReminderJob(reminder.id, reminder.dueAt);
    } catch (err) {
      console.warn("[reminders] schedule failed", err);
    }

    res.status(201).json(reminder);
  }),
);

remindersRouter.patch(
  "/:id",
  requirePermission("reminders:write"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.reminder.findFirst({
      where: { id: param(req, "id"), tenantId: req.user!.tenantId! },
    });
    if (!existing) throw new AppError("Reminder not found", 404);

    const body = reminderSchema.partial().parse(req.body);
    const reminder = await prisma.reminder.update({
      where: { id: existing.id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.channel !== undefined ? { channel: body.channel } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.customerId !== undefined
          ? { customerId: body.customerId }
          : {}),
        ...(body.dueAt !== undefined ? { dueAt: new Date(body.dueAt) } : {}),
      },
    });

    if (body.dueAt && reminder.status === "pending") {
      try {
        await scheduleReminderJob(reminder.id, reminder.dueAt);
      } catch (err) {
        console.warn("[reminders] reschedule failed", err);
      }
    }

    res.json(reminder);
  }),
);

remindersRouter.delete(
  "/:id",
  requirePermission("reminders:write"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.reminder.findFirst({
      where: { id: param(req, "id"), tenantId: req.user!.tenantId! },
    });
    if (!existing) throw new AppError("Reminder not found", 404);
    await prisma.reminder.update({
      where: { id: existing.id },
      data: { status: "cancelled" },
    });
    res.status(204).send();
  }),
);
