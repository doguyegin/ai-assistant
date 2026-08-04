import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  requireTenant,
} from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";

export const dashboardRouter = Router();

dashboardRouter.use(
  authenticate,
  requireTenant,
  requirePermission("dashboard:read"),
);

dashboardRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId!;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const weekAhead = new Date();
    weekAhead.setDate(weekAhead.getDate() + 7);

    const acceptedToday = await prisma.quote.findMany({
      where: {
        tenantId,
        status: "accepted",
        acceptedAt: { gte: start },
      },
      select: { totalAmount: true },
    });
    const dailyRevenue = acceptedToday.reduce(
      (s, q) => s + Number(q.totalAmount),
      0,
    );

    const [
      newCustomers,
      activeQuotes,
      upcomingReminders,
      pendingReviews,
      recentCustomers,
      upcomingReminderItems,
    ] = await Promise.all([
      prisma.customer.count({
        where: { tenantId, deletedAt: null, createdAt: { gte: start } },
      }),
      prisma.quote.count({
        where: { tenantId, status: { in: ["draft", "sent", "viewed"] } },
      }),
      prisma.reminder.count({
        where: {
          tenantId,
          status: "pending",
          dueAt: { lte: weekAhead },
        },
      }),
      prisma.review.count({
        where: { tenantId, replyText: null },
      }),
      prisma.customer.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, phone: true, createdAt: true },
      }),
      prisma.reminder.findMany({
        where: {
          tenantId,
          status: "pending",
          dueAt: { lte: weekAhead },
        },
        orderBy: { dueAt: "asc" },
        take: 5,
        include: { customer: { select: { name: true } } },
      }),
    ]);

    const aiSuggestions: string[] = [];
    if (pendingReviews > 0) {
      aiSuggestions.push(`${pendingReviews} Google yorumu cevap bekliyor`);
    }
    if (upcomingReminders > 0) {
      aiSuggestions.push(`${upcomingReminders} hatırlatma yaklaştı`);
    }
    if (activeQuotes > 0) {
      aiSuggestions.push(`${activeQuotes} teklif takip edilmeli`);
    }
    if (aiSuggestions.length === 0) {
      aiSuggestions.push("Bugün yeni müşteri ekleyerek CRM’i güçlendirin");
    }

    res.json({
      dailyRevenue,
      newCustomers,
      activeQuotes,
      upcomingReminders,
      pendingReviews,
      aiSuggestions,
      recentCustomers,
      upcomingReminderItems,
    });
  }),
);
