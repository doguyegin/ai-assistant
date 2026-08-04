import { Queue, Worker, type JobsOptions } from "bullmq";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { emitToTenant } from "../lib/socket.js";
import { sendWhatsAppText } from "../services/whatsapp.js";

const connection = { url: env.REDIS_URL };

export const reminderQueue = new Queue("reminders", { connection });
export const whatsappQueue = new Queue("whatsapp-bulk", { connection });

export async function scheduleReminderJob(
  reminderId: string,
  dueAt: Date,
) {
  const delay = Math.max(0, dueAt.getTime() - Date.now());
  const job = await reminderQueue.add(
    "fire-reminder",
    { reminderId },
    { delay, jobId: `reminder-${reminderId}`, removeOnComplete: true } satisfies JobsOptions,
  );
  await prisma.reminder.update({
    where: { id: reminderId },
    data: { jobId: job.id },
  });
  return job;
}

export function startWorkers() {
  const reminderWorker = new Worker(
    "reminders",
    async (job) => {
      const { reminderId } = job.data as { reminderId: string };
      const reminder = await prisma.reminder.findUnique({
        where: { id: reminderId },
        include: { customer: true, tenant: true },
      });
      if (!reminder || reminder.status !== "pending") return;

      if (reminder.channel === "whatsapp" && reminder.customer?.phone) {
        try {
          await sendWhatsAppText({
            tenantId: reminder.tenantId,
            to: reminder.customer.phone,
            body: `Hatırlatma: ${reminder.title}${reminder.notes ? `\n${reminder.notes}` : ""}`,
            customerId: reminder.customerId ?? undefined,
          });
        } catch (err) {
          console.warn("[reminder] whatsapp send failed", err);
        }
      }

      const updated = await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "sent" },
        include: { customer: { select: { id: true, name: true } } },
      });

      if (reminder.channel === "in_app") {
        emitToTenant(reminder.tenantId, "reminder:due", {
          id: updated.id,
          title: updated.title,
          type: updated.type,
          dueAt: updated.dueAt,
          customer: updated.customer,
        });
      }
    },
    { connection },
  );

  const whatsappWorker = new Worker(
    "whatsapp-bulk",
    async (job) => {
      const data = job.data as {
        tenantId: string;
        to: string;
        body: string;
        customerId?: string;
      };
      await sendWhatsAppText(data);
      await new Promise((r) => setTimeout(r, 200));
    },
    { connection, concurrency: 2 },
  );

  reminderWorker.on("failed", (job, err) => {
    console.error("[reminder-worker] failed", job?.id, err.message);
  });
  whatsappWorker.on("failed", (job, err) => {
    console.error("[whatsapp-worker] failed", job?.id, err.message);
  });

  return { reminderWorker, whatsappWorker };
}
