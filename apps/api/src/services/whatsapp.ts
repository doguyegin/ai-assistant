import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

type SendParams = {
  tenantId: string;
  to: string;
  body: string;
  customerId?: string;
};

function normalizePhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

export async function sendWhatsAppText(params: SendParams) {
  const conn = await prisma.whatsAppConnection.findUnique({
    where: { tenantId: params.tenantId },
  });

  const accessToken = conn?.accessToken || env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = conn?.phoneNumberId || env.WHATSAPP_PHONE_NUMBER_ID;
  const to = normalizePhone(params.to);

  const message = await prisma.message.create({
    data: {
      tenantId: params.tenantId,
      customerId: params.customerId,
      direction: "outbound",
      status: "queued",
      toPhone: to,
      body: params.body,
    },
  });

  if (!accessToken || !phoneNumberId) {
    // Mock mode when credentials missing
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: "sent",
        externalId: `mock-${message.id}`,
        payload: { mock: true },
      },
    });
    return { ...message, status: "sent" as const, mock: true };
  }

  const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: params.body },
    }),
  });

  const json = (await res.json()) as {
    messages?: { id: string }[];
    error?: { message: string };
  };

  if (!res.ok) {
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: "failed",
        errorMessage: json.error?.message ?? "WhatsApp API error",
        payload: json,
      },
    });
    throw new Error(json.error?.message ?? "WhatsApp send failed");
  }

  const externalId = json.messages?.[0]?.id;
  return prisma.message.update({
    where: { id: message.id },
    data: {
      status: "sent",
      externalId,
      payload: json,
    },
  });
}
