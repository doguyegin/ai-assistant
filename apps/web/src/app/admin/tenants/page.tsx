"use client";

import { useEffect, useState } from "react";
import { Building2, RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  PageHeader,
  Skeleton,
  Table,
} from "@/components/ui";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  aiUsageCount: number;
  createdAt: string;
  deletedAt: string | null;
  _count: {
    memberships: number;
    customers: number;
    quotes: number;
    messages: number;
  };
};

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [q, setQ] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (includeDeleted) params.set("includeDeleted", "true");
      const data = await api<{ tenants: Tenant[] }>(
        `/api/v1/admin/tenants?${params}`,
      );
      setTenants(data.tenants);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDeleted]);

  async function toggle(t: Tenant) {
    setBusyId(t.id);
    try {
      const path = t.deletedAt
        ? `/api/v1/admin/tenants/${t.id}/enable`
        : `/api/v1/admin/tenants/${t.id}/disable`;
      await api(path, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Firmalar"
        subtitle="Tüm tenant’ları görüntüle ve yönet"
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={load}>
            Yenile
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            className="pl-9"
            placeholder="İsim veya slug ara…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </div>
        <Button onClick={load}>Ara</Button>
        <label className="flex items-center gap-2 text-sm text-[var(--color-ink-soft)]">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
          />
          Devre dışı olanları göster
        </label>
      </div>

      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

      {loading ? (
        <Skeleton className="h-64" />
      ) : tenants.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Firma bulunamadı"
          description="Arama kriterlerinize uygun tenant yok."
        />
      ) : (
        <Table
          head={[
            "Firma",
            "Üye",
            "Müşteri",
            "Teklif",
            "Mesaj",
            "AI",
            "Durum",
            "",
          ]}
        >
          {tenants.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50/80">
              <td className="px-5 py-3.5">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{t.slug}</p>
              </td>
              <td className="px-5 py-3.5">{t._count.memberships}</td>
              <td className="px-5 py-3.5">{t._count.customers}</td>
              <td className="px-5 py-3.5">{t._count.quotes}</td>
              <td className="px-5 py-3.5">{t._count.messages}</td>
              <td className="px-5 py-3.5">{t.aiUsageCount}</td>
              <td className="px-5 py-3.5">
                {t.deletedAt ? (
                  <Badge tone="rose">Devre dışı</Badge>
                ) : (
                  <Badge tone="emerald">Aktif</Badge>
                )}
              </td>
              <td className="px-5 py-3.5 text-right">
                <Button
                  variant={t.deletedAt ? "secondary" : "danger"}
                  loading={busyId === t.id}
                  onClick={() => toggle(t)}
                  className="!px-3 !py-1.5 text-xs"
                >
                  {t.deletedAt ? "Aktifleştir" : "Devre dışı"}
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
