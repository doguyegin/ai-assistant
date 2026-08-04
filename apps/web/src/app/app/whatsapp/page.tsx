"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Link2,
  MessageCircle,
  Plug,
  Send,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Skeleton,
  Textarea,
} from "@/components/ui";

type Message = {
  id: string;
  body: string;
  direction: string;
  status: string;
  toPhone?: string | null;
  fromPhone?: string | null;
  createdAt: string;
  customer?: { name: string } | null;
};

type Template = { id: string; name: string; body: string };
type Customer = { id: string; name: string; phone: string | null };

type Tab = "messages" | "bulk" | "templates" | "connection";

const tabs: { id: Tab; label: string }[] = [
  { id: "messages", label: "Mesajlar" },
  { id: "bulk", label: "Toplu gönderim" },
  { id: "templates", label: "Şablonlar" },
  { id: "connection", label: "Bağlantı" },
];

export default function WhatsAppPage() {
  const [tab, setTab] = useState<Tab>("messages");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [info, setInfo] = useState("");

  const [connectForm, setConnectForm] = useState({
    phoneNumberId: "",
    accessToken: "",
    displayPhone: "",
  });
  const [sendForm, setSendForm] = useState({ to: "", body: "" });
  const [templateForm, setTemplateForm] = useState({ name: "", body: "" });
  const [bulkBody, setBulkBody] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  async function load() {
    const [conn, msgs, tpls, custs] = await Promise.all([
      api<{ connected: boolean }>("/api/v1/whatsapp/connection"),
      api<{ items: Message[] }>("/api/v1/whatsapp/messages"),
      api<{ items: Template[] }>("/api/v1/whatsapp/templates"),
      api<{ items: Customer[] }>("/api/v1/customers?limit=100"),
    ]);
    setConnected(conn.connected);
    setMessages(msgs.items);
    setTemplates(tpls.items);
    setCustomers(custs.items.filter((c) => c.phone));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/v1/whatsapp/send", {
        method: "POST",
        body: JSON.stringify(sendForm),
      });
      setSendForm({ to: "", body: "" });
      setInfo("Mesaj gönderildi.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function sendBulk(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ queued: number }>("/api/v1/whatsapp/bulk", {
        method: "POST",
        body: JSON.stringify({
          customerIds: Array.from(selected),
          body: bulkBody,
        }),
      });
      setInfo(`${res.queued} mesaj kuyruğa alındı.`);
      setBulkBody("");
      setSelected(new Set());
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createTemplate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/v1/whatsapp/templates", {
        method: "POST",
        body: JSON.stringify({ ...templateForm, language: "tr" }),
      });
      setTemplateForm({ name: "", body: "" });
      setInfo("Şablon kaydedildi.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function connect(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/v1/whatsapp/connect", {
        method: "POST",
        body: JSON.stringify(connectForm),
      });
      setInfo("WhatsApp bağlantısı kaydedildi.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        subtitle="Mesajlaşma, şablonlar ve toplu kampanya gönderimi"
        actions={
          connected === null ? undefined : connected ? (
            <Badge tone="emerald">Bağlı</Badge>
          ) : (
            <Badge tone="amber">Demo mod — API bağlı değil</Badge>
          )
        }
      />

      {info && (
        <div className="mb-5">
          <Alert tone="emerald">{info}</Alert>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-[var(--color-line)] bg-white p-1.5 shadow-[var(--shadow-card)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-[var(--color-brand)] text-white shadow-sm"
                : "text-[var(--color-ink-soft)] hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "messages" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Mesaj gönder" icon={Send} className="lg:col-span-1 h-fit">
            <form onSubmit={send} className="space-y-4">
              <Field label="Alıcı numara">
                <Input
                  value={sendForm.to}
                  onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })}
                  placeholder="905551234567"
                  required
                />
              </Field>
              <Field label="Mesaj">
                <Textarea
                  rows={4}
                  value={sendForm.body}
                  onChange={(e) => setSendForm({ ...sendForm, body: e.target.value })}
                  placeholder="Mesajınızı yazın..."
                  required
                />
              </Field>
              {templates.length > 0 && (
                <Field label="Şablondan doldur">
                  <div className="flex flex-wrap gap-1.5">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSendForm((f) => ({ ...f, body: t.body }))}
                        className="rounded-full border border-[var(--color-line)] px-3 py-1 text-xs font-medium hover:border-indigo-300 hover:bg-[var(--color-brand-soft)]"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
              <Button type="submit" loading={busy} icon={Send} className="w-full">
                Gönder
              </Button>
            </form>
          </Card>

          <Card title="Mesaj geçmişi" icon={MessageCircle} className="lg:col-span-2">
            {messages === null ? (
              <Skeleton className="h-48" />
            ) : messages.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="Henüz mesaj yok"
                description="Gönderilen ve gelen tüm WhatsApp mesajları burada listelenir."
              />
            ) : (
              <ul className="max-h-[520px] space-y-2.5 overflow-y-auto pr-1">
                {messages.map((m) => {
                  const outbound = m.direction === "outbound";
                  return (
                    <li
                      key={m.id}
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                        outbound
                          ? "ml-auto rounded-br-md bg-[var(--color-brand)] text-white"
                          : "mr-auto rounded-bl-md border border-[var(--color-line)] bg-slate-50"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p
                        className={`mt-1.5 flex items-center gap-1 text-[11px] ${
                          outbound ? "text-indigo-200" : "text-[var(--color-ink-faint)]"
                        }`}
                      >
                        {outbound ? (
                          <ArrowUpRight size={11} />
                        ) : (
                          <ArrowDownLeft size={11} />
                        )}
                        {m.customer?.name || m.toPhone || m.fromPhone} ·{" "}
                        {new Date(m.createdAt).toLocaleString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {m.status}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === "bulk" && (
        <Card title="Toplu gönderim" icon={Users}>
          <form onSubmit={sendBulk} className="space-y-5">
            <Field label={`Alıcılar (${selected.size} seçili)`}>
              {customers.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-soft)]">
                  Telefonu kayıtlı müşteri yok.
                </p>
              ) : (
                <div className="grid max-h-64 gap-1.5 overflow-y-auto rounded-xl border border-[var(--color-line)] p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {customers.map((c) => (
                    <label
                      key={c.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
                        selected.has(c.id)
                          ? "border-indigo-300 bg-[var(--color-brand-soft)]"
                          : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-[var(--color-brand)]"
                        checked={selected.has(c.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(c.id);
                          else next.delete(c.id);
                          setSelected(next);
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{c.name}</span>
                        <span className="block truncate text-xs text-[var(--color-ink-soft)]">
                          {c.phone}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Kampanya mesajı">
              <Textarea
                rows={4}
                value={bulkBody}
                onChange={(e) => setBulkBody(e.target.value)}
                placeholder="Örn. Kışlık lastik kampanyamız başladı! Bu hafta %20 indirim..."
                required
              />
            </Field>
            <Button
              type="submit"
              loading={busy}
              icon={Send}
              disabled={selected.size === 0}
            >
              {selected.size} kişiye gönder
            </Button>
          </form>
        </Card>
      )}

      {tab === "templates" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Yeni şablon" icon={Plug}>
            <form onSubmit={createTemplate} className="space-y-4">
              <Field label="Şablon adı">
                <Input
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, name: e.target.value })
                  }
                  placeholder="Örn. bakim-hatirlatma"
                  required
                />
              </Field>
              <Field label="Mesaj içeriği">
                <Textarea
                  rows={4}
                  value={templateForm.body}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, body: e.target.value })
                  }
                  placeholder="Merhaba, aracınızın bakım zamanı geldi..."
                  required
                />
              </Field>
              <Button type="submit" loading={busy}>
                Şablonu kaydet
              </Button>
            </form>
          </Card>

          <Card title="Kayıtlı şablonlar">
            {templates.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="Şablon yok"
                description="Sık kullandığınız mesajları şablon olarak kaydedin."
              />
            ) : (
              <ul className="space-y-3">
                {templates.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl border border-[var(--color-line)] p-4"
                  >
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-ink-soft)]">
                      {t.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === "connection" && (
        <Card title="Meta Cloud API bağlantısı" icon={Link2} className="max-w-xl">
          <p className="mb-5 text-sm text-[var(--color-ink-soft)]">
            Meta Developer hesabınızdan aldığınız bilgileri girin. Bilgi girilmezse
            sistem demo (mock) modda çalışır — mesajlar kayıt edilir ama gerçek
            gönderim yapılmaz.
          </p>
          <form onSubmit={connect} className="space-y-4">
            <Field label="Phone Number ID">
              <Input
                value={connectForm.phoneNumberId}
                onChange={(e) =>
                  setConnectForm({ ...connectForm, phoneNumberId: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Access Token">
              <Input
                type="password"
                value={connectForm.accessToken}
                onChange={(e) =>
                  setConnectForm({ ...connectForm, accessToken: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Görünen numara (opsiyonel)">
              <Input
                value={connectForm.displayPhone}
                onChange={(e) =>
                  setConnectForm({ ...connectForm, displayPhone: e.target.value })
                }
                placeholder="+90 555 123 45 67"
              />
            </Field>
            <Button type="submit" loading={busy} icon={Plug}>
              Bağlantıyı kaydet
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
