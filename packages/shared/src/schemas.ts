import { z } from "zod";
import { ROLES } from "./rbac.js";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(120),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const createTenantSchema = z.object({
  name: z.string().min(2).max(160),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug only lowercase letters, numbers, hyphen"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(400).optional().nullable(),
  logoUrl: z.string().max(2000).optional().nullable().or(z.literal("")),
});

export const customerSchema = z.object({
  name: z.string().min(1).max(160),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  vehiclePlate: z.string().max(20).optional().nullable(),
  vehicleBrand: z.string().max(80).optional().nullable(),
  vehicleModel: z.string().max(80).optional().nullable(),
  vehicleYear: z.number().int().min(1950).max(2100).optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
});

export const reminderTypes = [
  "maintenance",
  "insurance",
  "inspection",
  "tire",
  "appointment",
  "general",
] as const;

export const reminderSchema = z.object({
  customerId: z.string().cuid().optional().nullable(),
  title: z.string().min(1).max(200),
  type: z.enum(reminderTypes),
  dueAt: z.string().datetime(),
  channel: z.enum(["in_app", "whatsapp"]).default("in_app"),
  notes: z.string().optional().nullable(),
  status: z.enum(["pending", "sent", "completed", "cancelled"]).optional(),
});

export const quoteItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

export const quoteSchema = z.object({
  customerId: z.string().cuid(),
  title: z.string().min(1).max(200),
  notes: z.string().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  items: z.array(quoteItemSchema).min(1),
});

export const whatsappConnectSchema = z.object({
  phoneNumberId: z.string().min(1),
  accessToken: z.string().min(1),
  businessAccountId: z.string().optional(),
  displayPhone: z.string().optional(),
});

export const whatsappSendSchema = z.object({
  to: z.string().min(8),
  body: z.string().min(1).max(4096),
  customerId: z.string().cuid().optional(),
});

export const whatsappBulkSchema = z.object({
  customerIds: z.array(z.string().cuid()).min(1),
  body: z.string().min(1).max(4096),
});

export const whatsappTemplateSchema = z.object({
  name: z.string().min(1),
  language: z.string().default("tr"),
  body: z.string().min(1),
});

export const aiChatSchema = z.object({
  conversationId: z.string().cuid().optional(),
  message: z.string().min(1).max(8000),
});

export const aiGenerateSchema = z.object({
  type: z.enum([
    "campaign",
    "whatsapp",
    "quote",
    "review_reply",
    "instagram",
    "blog",
    "email",
    "sms",
  ]),
  context: z.string().min(1).max(8000),
});

export const googleReviewReplySchema = z.object({
  reply: z.string().min(1).max(4000),
});

export const roleSchema = z.enum(ROLES);

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type ReminderInput = z.infer<typeof reminderSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
