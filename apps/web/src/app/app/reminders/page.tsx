"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bell, Check, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useTenantSocket } from "@/lib/socket";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  reminderStatusTone,
  reminderTypeLabel,
} from "@/components/ui";

type Reminder = {
  id: string;
  title: string;
  type: string;
  dueAt: string;
  status: string;
  channel: string;
  customer?: { name: string } | null;
};

type Customer = { id: string; name: string };

const channelLabel: Record<string, string> = {
  in_app: "Uygulama içi",
  whatsapp: "WhatsApp",
};

export default function RemindersPage() {
  const [items, setItems] = useState<Reminder[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    type: "tire",
    dueAt: "",
    channel: "in_app",
    customerId: "",
    notes: "",
  });

  async function load() {
    const [r, c, me] = await Promise.all([
      api<{ items: Reminder[] }>("/api/v1/reminders"),
      api<{ items: Customer[] }>("/api/v1/customers?limit=100"),
      api<{ tenant: { id: string } | null }>("/api/v1/tenants/me"),
    ]);
    setItems(r.items);
    setCustomers(c.items);
    setTenantId(me.tenant?.id ?? null);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  useTenantSocket(tenantId, {
    "reminder:due": (payload: { title?: string }) => {
      setToast(`Hatırlatma: ${payload.title ?? "Zamanı geldi"}`);
      load().catch(console.error);
    },
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/v1/reminders", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          customerId: form.customerId || null,
          dueAt: new Date(form.dueAt).toISOString(),
        }),
      });
      setForm({
        title: "",
        type: "tire",
        dueAt: "",
        channel: "in_app",
        customerId: "",
        notes: "",
      });
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function cancel(id: string) {
    await api(`/api/v1/reminders/${id}`, { method: "DELETE" });
    await load();
  }

  async function complete(id: string) {
    await api(`/api/v1/reminders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Hatırlatmalar"
        subtitle="Bakım, sigorta, muayene ve lastik değişimi takibi"
        actions={
          <Button
            icon={showForm ? X : Plus}
            variant={showForm ? "secondary" : "primary"}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Vazgeç" : "Yeni hatırlatma"}
          </Button>
        }
      />

      {toast && (
        <div className="mb-5">
          <Alert tone="amber">{toast}</Alert>
        </div>
      )}

      {showForm && (
        <Card title="Yeni hatırlatma" icon={Bell} className="mb-6 animate-fade-up">
          <form onSubmit={create} className="grid gap-4 md:grid-cols-2">
            <Field label="Başlık *">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Örn. Kışlık lastik değişimi"
                required
              />
            </Field>
            <Field label="Tip">
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {Object.entries(reminderTypeLabel).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tarih ve saat *">
              <Input
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                required
              />
            </Field>
            <Field label="Bildirim kanalı">
              <Select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
              >
                <option value="in_app">Uygulama içi</option>
                <option value="whatsapp">WhatsApp</option>
              </Select>
            </Field>
            <Field label="Müşteri" className="md:col-span-2">
              <Select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              >
                <option value="">Müşteri seçin (opsiyonel)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="md:col-span-2">
              <Button type="submit" loading={saving} icon={Plus}>
                Hatırlatma oluştur
              </Button>
            </div>
          </form>
        </Card>
      )}

      {items === null ? (
        <Skeleton className="h-64" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Hatırlatma yok"
          description="Müşterileriniz için bakım ve randevu hatırlatmaları oluşturun; zamanı gelince otomatik gönderilsin."
          action={
            <Button icon={Plus} onClick={() => setShowForm(true)}>
              İlk hatırlatmayı oluştur
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((r) => {
            const st = reminderStatusTone[r.status] ?? {
              tone: "slate" as const,
              label: r.status,
            };
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-white px-5 py-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-amber-soft)] text-[var(--color-amber)]">
                    <Bell size={17} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{r.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
                      {new Date(r.dueAt).toLocaleString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {r.customer ? ` · ${r.customer.name}` : ""} ·{" "}
                      {channelLabel[r.channel] ?? r.channel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="slate">{reminderTypeLabel[r.type] ?? r.type}</Badge>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  {(r.status === "pending" || r.status === "sent") && (
                    <button
                      onClick={() => complete(r.id)}
                      className="rounded-lg p-2 text-[var(--color-ink-faint)] transition hover:bg-emerald-50 hover:text-emerald-600"
                      title="Tamamla"
                    >
                      <Check size={15} />
                    </button>
                  )}
                  {r.status === "pending" && (
                    <button
                      onClick={() => cancel(r.id)}
                      className="rounded-lg p-2 text-[var(--color-ink-faint)] transition hover:bg-rose-50 hover:text-rose-600"
                      title="İptal et"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
