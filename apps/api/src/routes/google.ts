import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { googleReviewReplySchema } from "@ai-assistant/shared";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { param } from "../lib/params.js";
import { aiProvider, GENERATE_SYSTEM } from "../services/ai.js";
import {
  authenticate,
  requirePermission,
  requireTenant,
} from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/error.js";

export const googleRouter = Router();

const gbpScopes = [
  "https://www.googleapis.com/auth/business.manage",
  "openid",
  "email",
];

function getOAuthClient() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  return new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.API_URL}/api/v1/google/callback`,
  );
}

googleRouter.get(
  "/auth-url",
  authenticate,
  requireTenant,
  requirePermission("google:write"),
  asyncHandler(async (req, res) => {
    const client = getOAuthClient();
    if (!client) {
      return res.json({
        url: null,
        mock: true,
        message: "Google OAuth not configured — use POST /google/connect-mock",
      });
    }
    const url = client.generateAuthUrl({
      access_type: "offline",
      scope: gbpScopes,
      state: req.user!.tenantId!,
      prompt: "consent",
    });
    res.json({ url });
  }),
);

googleRouter.get(
  "/callback",
  asyncHandler(async (req, res) => {
    const client = getOAuthClient();
    if (!client) throw new AppError("Google OAuth not configured", 503);
    const code = String(req.query.code || "");
    const tenantId = String(req.query.state || "");
    if (!code || !tenantId) throw new AppError("Missing code/state", 400);

    const { tokens } = await client.getToken(code);
    await prisma.googleConnection.upsert({
      where: { tenantId },
      create: {
        tenantId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : undefined,
      },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : undefined,
      },
    });

    res.redirect(`${env.WEB_URL}/app/google?connected=1`);
  }),
);

googleRouter.use(authenticate, requireTenant);

googleRouter.post(
  "/connect-mock",
  requirePermission("google:write"),
  asyncHandler(async (req, res) => {
    const accountId = String(req.body.accountId || "mock-account");
    const locationId = String(req.body.locationId || "mock-location");
    const conn = await prisma.googleConnection.upsert({
      where: { tenantId: req.user!.tenantId! },
      create: {
        tenantId: req.user!.tenantId!,
        accessToken: "mock-token",
        accountId,
        locationId,
      },
      update: { accountId, locationId, accessToken: "mock-token" },
    });

    // Seed sample reviews if empty
    const count = await prisma.review.count({
      where: { tenantId: req.user!.tenantId! },
    });
    if (count === 0) {
      await prisma.review.createMany({
        data: [
          {
            tenantId: req.user!.tenantId!,
            externalId: "mock-review-1",
            reviewerName: "Ahmet Y.",
            rating: 5,
            comment: "Çok hızlı ve profesyonel hizmet, teşekkürler!",
            reviewTime: new Date(),
          },
          {
            tenantId: req.user!.tenantId!,
            externalId: "mock-review-2",
            reviewerName: "Elif K.",
            rating: 3,
            comment: "İyiydi ama bekleme süresi uzundu.",
            reviewTime: new Date(),
          },
        ],
      });
    }

    res.json({ connected: true, connection: conn });
  }),
);

googleRouter.get(
  "/connection",
  requirePermission("google:read"),
  asyncHandler(async (req, res) => {
    const conn = await prisma.googleConnection.findUnique({
      where: { tenantId: req.user!.tenantId! },
    });
    res.json({
      connected: Boolean(conn),
      accountId: conn?.accountId,
      locationId: conn?.locationId,
      oauthConfigured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    });
  }),
);

googleRouter.get(
  "/reviews",
  requirePermission("google:read"),
  asyncHandler(async (req, res) => {
    const items = await prisma.review.findMany({
      where: { tenantId: req.user!.tenantId! },
      orderBy: { reviewTime: "desc" },
    });
    res.json({ items });
  }),
);

googleRouter.post(
  "/reviews/:id/suggest-reply",
  requirePermission("ai:use"),
  asyncHandler(async (req, res) => {
    const review = await prisma.review.findFirst({
      where: { id: param(req, "id"), tenantId: req.user!.tenantId! },
    });
    if (!review) throw new AppError("Review not found", 404);

    const reply = await aiProvider.generate(
      `Yorum: ${review.comment ?? ""}\nPuan: ${review.rating ?? "?"}/5\nYorumcu: ${review.reviewerName ?? "Müşteri"}`,
      GENERATE_SYSTEM.review_reply,
    );
    res.json({ reply });
  }),
);

googleRouter.post(
  "/reviews/:id/reply",
  requirePermission("google:write"),
  asyncHandler(async (req, res) => {
    const body = googleReviewReplySchema.parse(req.body);
    const review = await prisma.review.findFirst({
      where: { id: param(req, "id"), tenantId: req.user!.tenantId! },
    });
    if (!review) throw new AppError("Review not found", 404);

    // Real GBP reply API would be called here when credentials exist
    const updated = await prisma.review.update({
      where: { id: review.id },
      data: { replyText: body.reply, repliedAt: new Date() },
    });
    res.json(updated);
  }),
);

googleRouter.get(
  "/profile-checklist",
  requirePermission("google:read"),
  asyncHandler(async (req, res) => {
    const conn = await prisma.googleConnection.findUnique({
      where: { tenantId: req.user!.tenantId! },
    });
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: req.user!.tenantId! },
    });

    const checklist = [
      { key: "connected", label: "Google hesabı bağlı", ok: Boolean(conn) },
      { key: "name", label: "İşletme adı", ok: Boolean(tenant.name) },
      { key: "phone", label: "Telefon", ok: Boolean(tenant.phone) },
      { key: "address", label: "Adres", ok: Boolean(tenant.address) },
      { key: "logo", label: "Logo", ok: Boolean(tenant.logoUrl) },
      {
        key: "location",
        label: "Lokasyon ID",
        ok: Boolean(conn?.locationId),
      },
    ];

    res.json({
      score: Math.round(
        (checklist.filter((c) => c.ok).length / checklist.length) * 100,
      ),
      checklist,
    });
  }),
);

googleRouter.post(
  "/weekly-post",
  requirePermission("ai:use"),
  asyncHandler(async (req, res) => {
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: req.user!.tenantId! },
    });
    const topic = String(req.body.topic || "haftalık kampanya");
    const post = await aiProvider.generate(
      `İşletme: ${tenant.name}\nKonu: ${topic}\nGoogle Business için haftalık paylaşım metni yaz.`,
      GENERATE_SYSTEM.instagram,
    );
    res.json({ post });
  }),
);
