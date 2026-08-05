"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Search, Users } from "lucide-react";
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

type UserRow = {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  createdAt: string;
  deletedAt: string | null;
  memberships: {
    role: string;
    tenant: { id: string; name: string; slug: string };
  }[];
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
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
      const data = await api<{ users: UserRow[] }>(
        `/api/v1/admin/users?${params}`,
      );
      setUsers(data.users);
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

  async function toggle(u: UserRow) {
    setBusyId(u.id);
    try {
      const path = u.deletedAt
        ? `/api/v1/admin/users/${u.id}/enable`
        : `/api/v1/admin/users/${u.id}/disable`;
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
        title="Kullanıcılar"
        subtitle="Platform genelindeki hesaplar"
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
            placeholder="E-posta veya isim ara…"
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
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="Kullanıcı bulunamadı" />
      ) : (
        <Table head={["Kullanıcı", "Firma / rol", "Tip", "Durum", ""]}>
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50/80">
              <td className="px-5 py-3.5">
                <p className="font-medium">{u.name}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{u.email}</p>
              </td>
              <td className="px-5 py-3.5">
                {u.memberships.length === 0 ? (
                  <span className="text-xs text-[var(--color-ink-faint)]">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {u.memberships.map((m) => (
                      <Badge key={`${m.tenant.id}-${m.role}`} tone="slate">
                        {m.tenant.name} · {m.role}
                      </Badge>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-5 py-3.5">
                {u.isPlatformAdmin ? (
                  <Badge tone="amber">Platform Admin</Badge>
                ) : (
                  <Badge tone="brand">Kullanıcı</Badge>
                )}
              </td>
              <td className="px-5 py-3.5">
                {u.deletedAt ? (
                  <Badge tone="rose">Devre dışı</Badge>
                ) : (
                  <Badge tone="emerald">Aktif</Badge>
                )}
              </td>
              <td className="px-5 py-3.5 text-right">
                {!u.isPlatformAdmin && (
                  <Button
                    variant={u.deletedAt ? "secondary" : "danger"}
                    loading={busyId === u.id}
                    onClick={() => toggle(u)}
                    className="!px-3 !py-1.5 text-xs"
                  >
                    {u.deletedAt ? "Aktifleştir" : "Devre dışı"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
