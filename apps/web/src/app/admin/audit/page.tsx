"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ScrollText } from "lucide-react";
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

type AuditLog = {
  id: string;
  action: string;
  resource: string | null;
  ip: string | null;
  createdAt: string;
  user: { email: string; name: string } | null;
  tenant: { name: string; slug: string } | null;
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (action.trim()) params.set("action", action.trim());
      const data = await api<{ logs: AuditLog[] }>(
        `/api/v1/admin/audit?${params}`,
      );
      setLogs(data.logs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader
        title="Denetim kayıtları"
        subtitle="Platform genelindeki aksiyon logları"
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={load}>
            Yenile
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Aksiyon filtresi (örn. auth.login)"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          className="max-w-sm"
        />
        <Button onClick={load}>Filtrele</Button>
      </div>

      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

      {loading ? (
        <Skeleton className="h-64" />
      ) : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="Kayıt yok" />
      ) : (
        <Table head={["Zaman", "Aksiyon", "Kullanıcı", "Firma", "IP"]}>
          {logs.map((l) => (
            <tr key={l.id} className="hover:bg-slate-50/80">
              <td className="px-5 py-3 whitespace-nowrap text-xs text-[var(--color-ink-soft)]">
                {new Date(l.createdAt).toLocaleString("tr-TR")}
              </td>
              <td className="px-5 py-3">
                <Badge tone="slate">{l.action}</Badge>
              </td>
              <td className="px-5 py-3 text-sm">
                {l.user ? (
                  <>
                    <p className="font-medium">{l.user.name}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      {l.user.email}
                    </p>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-5 py-3 text-sm">
                {l.tenant?.name ?? "—"}
              </td>
              <td className="px-5 py-3 font-mono text-xs">
                {l.ip ?? "—"}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
