"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  ClipboardCopy,
  ListTodo,
  Send,
  Sparkles,
  User,
  Wand2,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Alert,
  Button,
  Card,
  Field,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
} from "@/components/ui";

type Msg = { role: "user" | "assistant"; content: string };

type Today = {
  advice: string;
  summaryText: string;
  totalCustomers: number;
};

const quickPrompts = [
  "Bugün ne yapmalıyım?",
  "Bu hafta hangi müşterileri aramalıyım?",
  "Kışlık lastik kampanyası için mesaj yaz",
  "Gelmeyi bırakan müşterilere ne göndermeliyim?",
];

const generateTypes: { id: string; label: string; placeholder: string }[] = [
  {
    id: "campaign",
    label: "Kampanya metni",
    placeholder: "Örn. Kışlık lastik + montaj, %20 indirim, bu haftaya özel",
  },
  {
    id: "whatsapp",
    label: "WhatsApp mesajı",
    placeholder: "Örn. Randevusunu unutan müşteriye nazik hatırlatma",
  },
  {
    id: "quote",
    label: "Teklif açıklaması",
    placeholder: "Örn. 4 adet Michelin yaz lastiği + balans için teklif metni",
  },
  {
    id: "review_reply",
    label: "Yorum yanıtı",
    placeholder: "Örn. 3 yıldız veren, bekleme süresinden şikayetçi müşteri",
  },
  {
    id: "instagram",
    label: "Instagram gönderisi",
    placeholder: "Örn. Yeni sezon lastikleri geldi duyurusu",
  },
  {
    id: "email",
    label: "E-posta",
    placeholder: "Örn. VIP müşterilere özel indirim duyurusu",
  },
  {
    id: "sms",
    label: "SMS",
    placeholder: "Örn. Yarınki randevu hatırlatması",
  },
];

type Tab = "chat" | "generate";

export default function AiPage() {
  const [tab, setTab] = useState<Tab>("chat");
  const [today, setToday] = useState<Today | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [genType, setGenType] = useState("campaign");
  const [genContext, setGenContext] = useState("");
  const [genResult, setGenResult] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Today>("/api/v1/ai/today").then(setToday).catch(console.error);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const userMsg = (text ?? input).trim();
    if (!userMsg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const res = await api<{ conversationId: string; reply: string }>(
        "/api/v1/ai/chat",
        {
          method: "POST",
          body: JSON.stringify({ conversationId, message: userMsg }),
        },
      );
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } finally {
      setLoading(false);
    }
  }

  async function generate(e: FormEvent) {
    e.preventDefault();
    setGenLoading(true);
    setGenResult("");
    try {
      const res = await api<{ content: string }>("/api/v1/ai/generate", {
        method: "POST",
        body: JSON.stringify({ type: genType, context: genContext }),
      });
      setGenResult(res.content);
    } finally {
      setGenLoading(false);
    }
  }

  const selectedType = generateTypes.find((t) => t.id === genType)!;

  return (
    <div>
      <PageHeader
        title="AI Asistan"
        subtitle="İşletmenize özel yapay zekâ — sorun, üretin, gönderin"
      />

      <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-[var(--color-line)] bg-white p-1.5 shadow-[var(--shadow-card)]">
        {(
          [
            { id: "chat", label: "Sohbet", icon: Bot },
            { id: "generate", label: "İçerik üretici", icon: Wand2 },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-[var(--color-brand)] text-white shadow-sm"
                : "text-[var(--color-ink-soft)] hover:bg-slate-100"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "chat" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex h-[600px] flex-col rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-card)]">
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg">
                      <Sparkles size={24} />
                    </span>
                    <h3 className="mt-4 font-semibold">Size nasıl yardımcı olabilirim?</h3>
                    <p className="mt-1 max-w-sm text-sm text-[var(--color-ink-soft)]">
                      İşletme verilerinize göre yanıt veririm. Aşağıdaki
                      örneklerden birini deneyin.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      {quickPrompts.map((p) => (
                        <button
                          key={p}
                          onClick={() => send(p)}
                          className="rounded-full border border-[var(--color-line)] px-3.5 py-1.5 text-xs font-medium transition hover:border-indigo-300 hover:bg-[var(--color-brand-soft)]"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                        m.role === "user"
                          ? "bg-slate-200 text-slate-600"
                          : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                      }`}
                    >
                      {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
                    </span>
                    <div
                      className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "rounded-tr-md bg-[var(--color-brand)] text-white"
                          : "rounded-tl-md border border-[var(--color-line)] bg-slate-50"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                      <Bot size={14} />
                    </span>
                    <div className="rounded-2xl rounded-tl-md border border-[var(--color-line)] bg-slate-50 px-4 py-3">
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-slate-400"
                            style={{ animationDelay: `${i * 0.2}s` }}
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex gap-2 border-t border-[var(--color-line)] p-4"
              >
                <input
                  className="flex-1 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)]"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Mesajınızı yazın..."
                />
                <Button type="submit" loading={loading} icon={Send}>
                  Gönder
                </Button>
              </form>
            </div>
          </div>

          <div className="space-y-4">
            {today ? (
              <Card title="Günün özeti" icon={ListTodo}>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--color-ink-soft)]">
                  {today.summaryText}
                </pre>
                <div className="mt-4 border-t border-[var(--color-line)] pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
                    AI tavsiyesi
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {today.advice}
                  </pre>
                </div>
              </Card>
            ) : (
              <Skeleton className="h-72" />
            )}
          </div>
        </div>
      )}

      {tab === "generate" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="İçerik üret" icon={Wand2}>
            <form onSubmit={generate} className="space-y-4">
              <Field label="İçerik türü">
                <Select value={genType} onChange={(e) => setGenType(e.target.value)}>
                  {generateTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ne hakkında olsun?">
                <Textarea
                  rows={5}
                  value={genContext}
                  onChange={(e) => setGenContext(e.target.value)}
                  placeholder={selectedType.placeholder}
                  required
                />
              </Field>
              <Button type="submit" loading={genLoading} icon={Sparkles}>
                Üret
              </Button>
            </form>
          </Card>

          <Card
            title="Sonuç"
            actions={
              genResult ? (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(genResult);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]"
                >
                  <ClipboardCopy size={13} />
                  {copied ? "Kopyalandı!" : "Kopyala"}
                </button>
              ) : undefined
            }
          >
            {genLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : genResult ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {genResult}
              </pre>
            ) : (
              <Alert tone="brand">
                Üretilen içerik burada görünecek. WhatsApp mesajı, kampanya,
                Instagram gönderisi ve daha fazlasını saniyeler içinde yazdırın.
              </Alert>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
