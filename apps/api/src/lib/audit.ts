import { prisma } from "./prisma.js";

export async function writeAudit(params: {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  resource?: string;
  meta?: unknown;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId ?? undefined,
        userId: params.userId ?? undefined,
        action: params.action,
        resource: params.resource,
        meta: params.meta as object | undefined,
        ip: params.ip,
      },
    });
  } catch (err) {
    console.warn("[audit] write failed", err);
  }
}
