import { Router } from "express";
import {
  whatsappBulkSchema,
  whatsappConnectSchema,
  whatsappSendSchema,
  whatsappTemplateSchema,
} from "@ai-assistant/shared";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { param } from "../lib/params.js";
import { sendWhatsAppText } from "../services/whatsapp.js";
import { whatsappQueue } from "../queues/index.js";
import { writeAudit } from "../lib/audit.js";
import {
  authenticate,
  requirePermission,
  requireTenant,
} from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/error.js";

export const whatsappRouter = Router();

whatsappRouter.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

whatsappRouter.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const body = req.body as {
      entry?: {
        changes?: {
          value?: {
            metadata?: { phone_number_id?: string };
            messages?: {
              from: string;
              id: string;
              text?: { body: string };
            }[];
          };
        }[];
      }[];
    };

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const phoneNumberId = change.value?.metadata?.phone_number_id;
        const messages = change.value?.messages ?? [];
        if (!phoneNumberId || !messages.length) continue;

        const conn = await prisma.whatsAppConnection.findFirst({
          where: { phoneNumberId },
        });
        if (!conn) continue;

        for (const msg of messages) {
          const customer = await prisma.customer.findFirst({
            where: {
              tenantId: conn.tenantId,
              phone: { contains: msg.from.slice(-10) },
              deletedAt: null,
            },
          });
          await prisma.message.create({
            data: {
              tenantId: conn.tenantId,
              customerId: customer?.id,
              direction: "inbound",
              status: "delivered",
              fromPhone: msg.from,
              body: msg.text?.body ?? "",
              externalId: msg.id,
              payload: msg as object,
            },
          });
        }
      }
    }

    res.sendStatus(200);
  }),
);

whatsappRouter.use(authenticate, requireTenant);

whatsappRouter.get(
  "/connection",
  requirePermission("whatsapp:read"),
  asyncHandler(async (req, res) => {
    const conn = await prisma.whatsAppConnection.findUnique({
      where: { tenantId: req.user!.tenantId! },
    });
    if (!conn) return res.json({ connected: false });
    res.json({
      connected: true,
      phoneNumberId: conn.phoneNumberId,
      displayPhone: conn.displayPhone,
      businessAccountId: conn.businessAccountId,
      isActive: conn.isActive,
    });
  }),
);

whatsappRouter.post(
  "/connect",
  requirePermission("whatsapp:write"),
  asyncHandler(async (req, res) => {
    const body = whatsappConnectSchema.parse(req.body);
    const conn = await prisma.whatsAppConnection.upsert({
      where: { tenantId: req.user!.tenantId! },
      create: {
        tenantId: req.user!.tenantId!,
        phoneNumberId: body.phoneNumberId,
        accessToken: body.accessToken,
        businessAccountId: body.businessAccountId,
        displayPhone: body.displayPhone,
      },
      update: {
        phoneNumberId: body.phoneNumberId,
        accessToken: body.accessToken,
        businessAccountId: body.businessAccountId,
        displayPhone: body.displayPhone,
        isActive: true,
      },
    });
    res.json({
      connected: true,
      phoneNumberId: conn.phoneNumberId,
      displayPhone: conn.displayPhone,
    });
  }),
);

whatsappRouter.post(
  "/send",
  requirePermission("whatsapp:write"),
  asyncHandler(async (req, res) => {
    const body = whatsappSendSchema.parse(req.body);
    const message = await sendWhatsAppText({
      tenantId: req.user!.tenantId!,
      to: body.to,
      body: body.body,
      customerId: body.customerId,
    });
    res.status(201).json(message);
  }),
);

whatsappRouter.post(
  "/bulk",
  requirePermission("whatsapp:write"),
  asyncHandler(async (req, res) => {
    const body = whatsappBulkSchema.parse(req.body);
    const customers = await prisma.customer.findMany({
      where: {
        tenantId: req.user!.tenantId!,
        id: { in: body.customerIds },
        deletedAt: null,
        phone: { not: null },
      },
    });

    for (const customer of customers) {
      if (!customer.phone) continue;
      await whatsappQueue.add(
        "send",
        {
          tenantId: req.user!.tenantId!,
          to: customer.phone,
          body: body.body,
          customerId: customer.id,
        },
        { removeOnComplete: true },
      );
    }

    await writeAudit({
      tenantId: req.user!.tenantId,
      userId: req.user!.id,
      action: "whatsapp.bulk",
      meta: { count: customers.length },
      ip: req.ip,
    });

    res.status(202).json({ queued: customers.length });
  }),
);

whatsappRouter.get(
  "/messages",
  requirePermission("whatsapp:read"),
  asyncHandler(async (req, res) => {
    const items = await prisma.message.findMany({
      where: { tenantId: req.user!.tenantId! },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { customer: { select: { id: true, name: true } } },
    });
    res.json({ items });
  }),
);

whatsappRouter.get(
  "/templates",
  requirePermission("whatsapp:read"),
  asyncHandler(async (req, res) => {
    const items = await prisma.messageTemplate.findMany({
      where: { tenantId: req.user!.tenantId! },
      orderBy: { name: "asc" },
    });
    res.json({ items });
  }),
);

whatsappRouter.post(
  "/templates",
  requirePermission("whatsapp:write"),
  asyncHandler(async (req, res) => {
    const body = whatsappTemplateSchema.parse(req.body);
    const item = await prisma.messageTemplate.create({
      data: {
        tenantId: req.user!.tenantId!,
        name: body.name,
        language: body.language,
        body: body.body,
      },
    });
    res.status(201).json(item);
  }),
);

whatsappRouter.post(
  "/templates/:id/send",
  requirePermission("whatsapp:write"),
  asyncHandler(async (req, res) => {
    const template = await prisma.messageTemplate.findFirst({
      where: { id: param(req, "id"), tenantId: req.user!.tenantId! },
    });
    if (!template) throw new AppError("Template not found", 404);
    const to = String(req.body.to || "");
    if (!to) throw new AppError("to required", 400);
    const message = await sendWhatsAppText({
      tenantId: req.user!.tenantId!,
      to,
      body: template.body,
      customerId: req.body.customerId,
    });
    res.status(201).json(message);
  }),
);
