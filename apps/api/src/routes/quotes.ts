import { Router } from "express";
import { quoteSchema } from "@ai-assistant/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { param } from "../lib/params.js";
import { generateQuotePdf } from "../services/pdf.js";
import { sendWhatsAppText } from "../services/whatsapp.js";
import {
  authenticate,
  requirePermission,
  requireTenant,
} from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/error.js";

export const quotesRouter = Router();

quotesRouter.use(authenticate, requireTenant);

quotesRouter.get(
  "/",
  requirePermission("quotes:read"),
  asyncHandler(async (req, res) => {
    const items = await prisma.quote.findMany({
      where: { tenantId: req.user!.tenantId! },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ items });
  }),
);

quotesRouter.get(
  "/:id",
  requirePermission("quotes:read"),
  asyncHandler(async (req, res) => {
    const quote = await prisma.quote.findFirst({
      where: { id: param(req, "id"), tenantId: req.user!.tenantId! },
      include: { customer: true, items: true },
    });
    if (!quote) throw new AppError("Quote not found", 404);
    res.json(quote);
  }),
);

quotesRouter.post(
  "/",
  requirePermission("quotes:write"),
  asyncHandler(async (req, res) => {
    const body = quoteSchema.parse(req.body);
    const customer = await prisma.customer.findFirst({
      where: {
        id: body.customerId,
        tenantId: req.user!.tenantId!,
        deletedAt: null,
      },
    });
    if (!customer) throw new AppError("Customer not found", 404);

    const items = body.items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      return {
        description: item.description,
        quantity: new Prisma.Decimal(item.quantity),
        unitPrice: new Prisma.Decimal(item.unitPrice),
        lineTotal: new Prisma.Decimal(lineTotal),
      };
    });
    const totalAmount = items.reduce(
      (sum, i) => sum + Number(i.lineTotal),
      0,
    );

    const quote = await prisma.quote.create({
      data: {
        tenantId: req.user!.tenantId!,
        customerId: customer.id,
        title: body.title,
        notes: body.notes || null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        totalAmount: new Prisma.Decimal(totalAmount),
        items: { create: items },
      },
      include: { items: true, customer: true },
    });

    res.status(201).json(quote);
  }),
);

quotesRouter.post(
  "/:id/pdf",
  requirePermission("quotes:write"),
  asyncHandler(async (req, res) => {
    const quote = await prisma.quote.findFirst({
      where: { id: param(req, "id"), tenantId: req.user!.tenantId! },
      include: { items: true, customer: true, tenant: true },
    });
    if (!quote) throw new AppError("Quote not found", 404);

    const pdf = await generateQuotePdf({
      quoteId: quote.id,
      tenantName: quote.tenant.name,
      customerName: quote.customer.name,
      title: quote.title,
      notes: quote.notes,
      publicToken: quote.publicToken,
      items: quote.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
      totalAmount: Number(quote.totalAmount),
    });

    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: { pdfPath: pdf.key, status: quote.status === "draft" ? "sent" : quote.status },
      include: { items: true, customer: true },
    });

    res.json({ quote: updated, pdfUrl: pdf.url, publicUrl: pdf.publicUrl });
  }),
);

quotesRouter.post(
  "/:id/send-whatsapp",
  requirePermission("quotes:write"),
  asyncHandler(async (req, res) => {
    const quote = await prisma.quote.findFirst({
      where: { id: param(req, "id"), tenantId: req.user!.tenantId! },
      include: { customer: true },
    });
    if (!quote) throw new AppError("Quote not found", 404);
    if (!quote.customer.phone) throw new AppError("Customer has no phone", 400);

    const { env } = await import("../config/env.js");
    const publicUrl = `${env.PUBLIC_QUOTE_BASE_URL}/${quote.publicToken}`;
    const message = await sendWhatsAppText({
      tenantId: req.user!.tenantId!,
      to: quote.customer.phone,
      body: `Merhaba ${quote.customer.name}, teklifiniz hazır: ${quote.title}\nToplam: ${Number(quote.totalAmount).toFixed(2)} TL\nOnay: ${publicUrl}`,
      customerId: quote.customerId,
    });

    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "sent" },
    });

    res.json({ message });
  }),
);
