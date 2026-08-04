import { Router } from "express";
import { aiChatSchema, aiGenerateSchema } from "@ai-assistant/shared";
import { prisma } from "../lib/prisma.js";
import { param } from "../lib/params.js";
import { aiProvider, GENERATE_SYSTEM } from "../services/ai.js";
import {
  authenticate,
  requirePermission,
  requireTenant,
} from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/error.js";

export const aiRouter = Router();

aiRouter.use(authenticate, requireTenant, requirePermission("ai:use"));

async function buildTodayContext(tenantId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);

  const [
    newCustomers,
    pendingReminders,
    pendingQuotes,
    unansweredReviews,
    totalCustomers,
  ] = await Promise.all([
    prisma.customer.count({
      where: { tenantId, deletedAt: null, createdAt: { gte: start } },
    }),
    prisma.reminder.count({
      where: {
        tenantId,
        status: "pending",
        dueAt: { lte: weekAhead },
      },
    }),
    prisma.quote.count({
      where: { tenantId, status: { in: ["draft", "sent", "viewed"] } },
    }),
    prisma.review.count({
      where: { tenantId, replyText: null },
    }),
    prisma.customer.count({ where: { tenantId, deletedAt: null } }),
  ]);

  return {
    newCustomers,
    pendingReminders,
    pendingQuotes,
    unansweredReviews,
    totalCustomers,
    summaryText: [
      `Toplam müşteri: ${totalCustomers}`,
      `Bugün yeni müşteri: ${newCustomers}`,
      `Yaklaşan/bekleyen hatırlatma: ${pendingReminders}`,
      `Aktif teklif: ${pendingQuotes}`,
      `Cevaplanmamış yorum: ${unansweredReviews}`,
    ].join("\n"),
  };
}

aiRouter.get(
  "/today",
  asyncHandler(async (req, res) => {
    const ctx = await buildTodayContext(req.user!.tenantId!);
    const advice = await aiProvider.generate(
      `Bugün ne yapmalıyım?\n\nİşletme verileri:\n${ctx.summaryText}`,
      "Sen bir işletme asistanısın. Türkçe, madde madde, kısa aksiyon önerileri ver.",
    );
    res.json({ ...ctx, advice });
  }),
);

aiRouter.post(
  "/chat",
  asyncHandler(async (req, res) => {
    const body = aiChatSchema.parse(req.body);
    const tenantId = req.user!.tenantId!;

    let conversation = body.conversationId
      ? await prisma.aiConversation.findFirst({
          where: { id: body.conversationId, tenantId },
        })
      : null;

    if (!conversation) {
      conversation = await prisma.aiConversation.create({
        data: {
          tenantId,
          title: body.message.slice(0, 80),
        },
      });
    }

    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: body.message,
      },
    });

    const history = await prisma.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 40,
    });

    const ctx = await buildTodayContext(tenantId);
    const reply = await aiProvider.chat([
      {
        role: "system",
        content: `Sen AI İşletme Asistanısın. Türkçe yanıt ver.\nGüncel işletme özeti:\n${ctx.summaryText}`,
      },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ]);

    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: reply,
      },
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { aiUsageCount: { increment: 1 } },
    });

    res.json({
      conversationId: conversation.id,
      reply,
      usage: { increment: 1 },
    });
  }),
);

aiRouter.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const body = aiGenerateSchema.parse(req.body);
    const system = GENERATE_SYSTEM[body.type];
    if (!system) throw new AppError("Unknown generate type", 400);

    const content = await aiProvider.generate(body.context, system);
    await prisma.tenant.update({
      where: { id: req.user!.tenantId! },
      data: { aiUsageCount: { increment: 1 } },
    });
    res.json({ type: body.type, content });
  }),
);

aiRouter.get(
  "/conversations",
  asyncHandler(async (req, res) => {
    const items = await prisma.aiConversation.findMany({
      where: { tenantId: req.user!.tenantId! },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    res.json({ items });
  }),
);

aiRouter.get(
  "/conversations/:id",
  asyncHandler(async (req, res) => {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: param(req, "id"), tenantId: req.user!.tenantId! },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversation) throw new AppError("Conversation not found", 404);
    res.json(conversation);
  }),
);
