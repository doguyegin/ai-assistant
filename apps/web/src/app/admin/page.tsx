"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Building2,
  FileText,
  MessageCircle,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { Badge, Card, PageHeader, Skeleton, StatCard, Table } from "@/components/ui";

type Overview = {
  counts: {
    tenants: number;
    activeTenants: number;
    users: number;
    customers: number;
    quotes: number;
    reminders: number;
    messages: number;
  };
  traffic: {
    uptimeSeconds: number;
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    lastHourRequests: number;
    lastHourErrors: number;
  };
  recentAudits: {
    id: string;
    action: string;
    createdAt: string;
    ip: string | null;
    user: { email: string; name: string } | null;
    tenant: { name: string; slug: string } | null;
  }[];
};

function formatUptime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}s ${m}dk`;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Overview>("/api/v1/admin/overview")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!data) {
    return (
      <div>
        <PageHeader title="Platform özeti" subtitle="Tüm sistem durumu" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Platform özeti"
        subtitle="Firmalar, kullanıcılar ve API trafiği"
        actions={
          <Link
            href="/admin/traffic"
            className="text-sm font-medium text-[var(--color-brand)] hover:underline"
          >
            Trafik detayı →
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Aktif firma"
          value={String(data.counts.tenants)}
          icon={Building2}
          tone="brand"
          hint={`${data.counts.activeTenants} son 30 günde aktif`}
        />
        <StatCard
          label="Kullanıcı"
          value={String(data.counts.users)}
          icon={Users}
          tone="teal"
        />
        <StatCard
          label="Son 1 saat istek"
          value={String(data.traffic.lastHourRequests)}
          icon={Activity}
          tone="amber"
          hint={`${data.traffic.lastHourErrors} hata · uptime ${formatUptime(data.traffic.uptimeSeconds)}`}
        />
        <StatCard
          label="Mesaj / teklif"
          value={`${data.counts.messages} / ${data.counts.quotes}`}
          icon={MessageCircle}
          tone="emerald"
          hint={`${data.counts.customers} müşteri · ${data.counts.reminders} hatırlatma`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Hızlı erişim" icon={FileText}>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { href: "/admin/tenants", label: "Firmaları yönet" },
              { href: "/admin/users", label: "Kullanıcıları yönet" },
              { href: "/admin/traffic", label: "API trafiğini izle" },
              { href: "/admin/audit", label: "Denetim kayıtları" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-xl border border-[var(--color-line)] px-4 py-3 text-sm font-medium transition hover:border-indigo-300 hover:bg-[var(--color-brand-soft)]"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Son denetim kayıtları" icon={FileText}>
          {data.recentAudits.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-soft)]">Kayıt yok</p>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {data.recentAudits.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.action}</p>
                    <p className="truncate text-xs text-[var(--color-ink-soft)]">
                      {a.user?.email ?? "—"}
                      {a.tenant ? ` · ${a.tenant.name}` : ""}
                    </p>
                  </div>
                  <Badge tone="slate">
                    {new Date(a.createdAt).toLocaleString("tr-TR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Table head={["Metrik", "Değer"]}>
          <tr>
            <td className="px-5 py-3">Toplam istek</td>
            <td className="px-5 py-3 font-medium">{data.traffic.totalRequests}</td>
          </tr>
          <tr>
            <td className="px-5 py-3">Toplam hata</td>
            <td className="px-5 py-3 font-medium">{data.traffic.totalErrors}</td>
          </tr>
          <tr>
            <td className="px-5 py-3">Hata oranı</td>
            <td className="px-5 py-3 font-medium">
              %{(data.traffic.errorRate * 100).toFixed(2)}
            </td>
          </tr>
        </Table>
      </div>
    </div>
  );
}
