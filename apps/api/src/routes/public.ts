import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { param } from "../lib/params.js";
import { asyncHandler, AppError } from "../middleware/error.js";

export const publicRouter = Router();

publicRouter.get(
  "/quotes/:token",
  asyncHandler(async (req, res) => {
    const quote = await prisma.quote.findUnique({
      where: { publicToken: param(req, "token") },
      include: {
        items: true,
        customer: { select: { name: true } },
        tenant: { select: { name: true, phone: true } },
      },
    });
    if (!quote) throw new AppError("Quote not found", 404);

    if (quote.status === "sent") {
      await prisma.quote.update({
        where: { id: quote.id },
        data: { status: "viewed" },
      });
    }

    res.json({
      id: quote.id,
      title: quote.title,
      notes: quote.notes,
      status: quote.status === "sent" ? "viewed" : quote.status,
      totalAmount: quote.totalAmount,
      validUntil: quote.validUntil,
      items: quote.items,
      customerName: quote.customer.name,
      tenantName: quote.tenant.name,
      tenantPhone: quote.tenant.phone,
      pdfPath: quote.pdfPath,
    });
  }),
);

publicRouter.post(
  "/quotes/:token/accept",
  asyncHandler(async (req, res) => {
    const quote = await prisma.quote.findUnique({
      where: { publicToken: param(req, "token") },
    });
    if (!quote) throw new AppError("Quote not found", 404);
    if (["accepted", "rejected", "expired"].includes(quote.status)) {
      throw new AppError(`Quote already ${quote.status}`, 400);
    }

    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });

    await prisma.customer.update({
      where: { id: quote.customerId },
      data: {
        lastActivityAt: new Date(),
        totalSpend: { increment: quote.totalAmount },
      },
    });

    res.json({ status: updated.status, acceptedAt: updated.acceptedAt });
  }),
);

publicRouter.post(
  "/quotes/:token/reject",
  asyncHandler(async (req, res) => {
    const quote = await prisma.quote.findUnique({
      where: { publicToken: param(req, "token") },
    });
    if (!quote) throw new AppError("Quote not found", 404);

    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "rejected" },
    });
    res.json({ status: updated.status });
  }),
);
