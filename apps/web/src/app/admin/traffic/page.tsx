"use client";

import { useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import {
  Card,
  PageHeader,
  Skeleton,
  StatCard,
  Table,
  Button,
} from "@/components/ui";

type Traffic = {
  uptimeSeconds: number;
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  lastHourRequests: number;
  lastHourErrors: number;
  timeline: { minute: string; requests: number; errors: number }[];
  topRoutes: {
    route: string;
    count: number;
    errors: number;
    avgMs: number;
    maxMs: number;
  }[];
};

function formatUptime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}s ${m}dk ${s}sn`;
}

export default function AdminTrafficPage() {
  const [data, setData] = useState<Traffic | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await api<Traffic>("/api/v1/admin/traffic"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  const maxReq = Math.max(1, ...(data?.timeline.map((t) => t.requests) ?? [1]));

  return (
    <div>
      <PageHeader
        title="Trafik izleme"
        subtitle="Canlı API istekleri ve hata oranları (15 sn yenilenir)"
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={load} loading={loading}>
            Yenile
          </Button>
        }
      />

      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Toplam istek"
              value={String(data.totalRequests)}
              icon={Activity}
              tone="brand"
              hint={`Uptime ${formatUptime(data.uptimeSeconds)}`}
            />
            <StatCard
              label="Toplam hata"
              value={String(data.totalErrors)}
              icon={Activity}
              tone="rose"
              hint={`Oran %${(data.errorRate * 100).toFixed(2)}`}
            />
            <StatCard
              label="Son 1 saat"
              value={String(data.lastHourRequests)}
              icon={Activity}
              tone="amber"
              hint={`${data.lastHourErrors} hata`}
            />
            <StatCard
              label="Endpoint sayısı"
              value={String(data.topRoutes.length)}
              icon={Activity}
              tone="teal"
            />
          </div>

          <Card title="Son 60 dakika" className="mt-6">
            {data.timeline.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-soft)]">
                Henüz istek kaydı yok. API’ye birkaç istek atın.
              </p>
            ) : (
              <div className="flex h-40 items-end gap-0.5">
                {data.timeline.slice(-60).map((m) => (
                  <div
                    key={m.minute}
                    className="group relative flex-1 rounded-t bg-[var(--color-brand)]/80 transition hover:bg-[var(--color-brand)]"
                    style={{
                      height: `${Math.max(4, (m.requests / maxReq) * 100)}%`,
                    }}
                    title={`${new Date(m.minute).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}: ${m.requests} istek, ${m.errors} hata`}
                  />
                ))}
              </div>
            )}
          </Card>

          <div className="mt-6">
            <Table head={["Route", "İstek", "Hata", "Ort. ms", "Max ms"]}>
              {data.topRoutes.map((r) => (
                <tr key={r.route} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 font-mono text-xs">{r.route}</td>
                  <td className="px-5 py-3">{r.count}</td>
                  <td className="px-5 py-3">{r.errors}</td>
                  <td className="px-5 py-3">{r.avgMs}</td>
                  <td className="px-5 py-3">{r.maxMs}</td>
                </tr>
              ))}
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
