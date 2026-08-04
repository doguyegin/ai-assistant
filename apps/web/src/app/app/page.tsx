"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Bell,
  FileText,
  Lightbulb,
  Star,
  UserPlus,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
  Badge,
  reminderTypeLabel,
} from "@/components/ui";

type Summary = {
  dailyRevenue: number;
  newCustomers: number;
  activeQuotes: number;
  upcomingReminders: number;
  pendingReviews: number;
  aiSuggestions: string[];
  recentCustomers: { id: string; name: string; phone: string | null; createdAt: string }[];
  upcomingReminderItems: {
    id: string;
    title: string;
    type: string;
    dueAt: string;
    customer?: { name: string } | null;
  }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Summary>("/api/v1/dashboard/summary")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;

  if (!data) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Bugünün işletme özeti" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString("tr-TR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Günlük gelir"
          value={`${data.dailyRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`}
          icon={Banknote}
          tone="emerald"
          hint="Bugün onaylanan teklifler"
        />
        <StatCard
          label="Yeni müşteri"
          value={String(data.newCustomers)}
          icon={UserPlus}
          tone="brand"
          hint="Bugün eklenen"
        />
        <StatCard
          label="Aktif teklif"
          value={String(data.activeQuotes)}
          icon={FileText}
          tone="teal"
          hint="Yanıt bekleyen"
        />
        <StatCard
          label="Hatırlatma"
          value={String(data.upcomingReminders)}
          icon={Bell}
          tone="amber"
          hint="7 gün içinde"
        />
        <StatCard
          label="Bekleyen yorum"
          value={String(data.pendingReviews)}
          icon={Star}
          tone="rose"
          hint="Cevaplanmamış"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card
          title="AI önerileri"
          icon={Lightbulb}
          actions={
            <Link
              href="/app/ai"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-brand)] hover:underline"
            >
              AI Asistan <ArrowRight size={13} />
            </Link>
          }
        >
          <ul className="space-y-3">
            {data.aiSuggestions.map((s, i) => (
              <li key={s} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-xs font-bold text-[var(--color-brand)]">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Yaklaşan hatırlatmalar"
          icon={Bell}
          actions={
            <Link
              href="/app/reminders"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-brand)] hover:underline"
            >
              Tümü <ArrowRight size={13} />
            </Link>
          }
        >
          {data.upcomingReminderItems.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Yaklaşan hatırlatma yok"
              description="Bakım, sigorta veya lastik değişimi hatırlatmaları burada görünür."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {data.upcomingReminderItems.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
                      {new Date(r.dueAt).toLocaleString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {r.customer ? ` · ${r.customer.name}` : ""}
                    </p>
                  </div>
                  <Badge tone="amber">{reminderTypeLabel[r.type] ?? r.type}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Son eklenen müşteriler"
          icon={Users}
          className="lg:col-span-2"
          actions={
            <Link
              href="/app/customers"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-brand)] hover:underline"
            >
              CRM <ArrowRight size={13} />
            </Link>
          }
        >
          {data.recentCustomers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Henüz müşteri yok"
              description="İlk müşterinizi ekleyerek CRM'i kullanmaya başlayın."
              action={
                <Link
                  href="/app/customers"
                  className="rounded-xl bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white"
                >
                  Müşteri ekle
                </Link>
              }
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.recentCustomers.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/app/customers/${c.id}`}
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] p-3.5 transition hover:border-indigo-300 hover:bg-[var(--color-brand-soft)]"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                      {c.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="truncate text-xs text-[var(--color-ink-soft)]">
                        {c.phone || "Telefon yok"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
