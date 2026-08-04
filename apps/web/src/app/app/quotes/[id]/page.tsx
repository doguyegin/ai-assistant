"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  FileDown,
  MessageCircle,
  QrCode,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  PageHeader,
  Skeleton,
  quoteStatusTone,
} from "@/components/ui";

type Quote = {
  id: string;
  title: string;
  status: string;
  notes: string | null;
  totalAmount: number | string;
  publicToken: string;
  pdfPath: string | null;
  createdAt: string;
  customer: { name: string; phone: string | null };
  items: {
    id: string;
    description: string;
    quantity: number | string;
    unitPrice: number | string;
    lineTotal: number | string;
  }[];
};

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"pdf" | "wa" | null>(null);

  const load = useCallback(async () => {
    const q = await api<Quote>(`/api/v1/quotes/${params.id}`);
    setQuote(q);
  }, [params.id]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  if (!quote) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const st = quoteStatusTone[quote.status] ?? {
    tone: "slate" as const,
    label: quote.status,
  };

  return (
    <div>
      <Link
        href="/app/quotes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-brand)]"
      >
        <ArrowLeft size={15} />
        Tekliflere dön
      </Link>

      <PageHeader
        title={quote.title}
        subtitle={`${quote.customer.name} · ${new Date(quote.createdAt).toLocaleDateString("tr-TR")}`}
        actions={<Badge tone={st.tone}>{st.label}</Badge>}
      />

      {message && (
        <div className="mb-5">
          <Alert tone="emerald">{message}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Kalemler" className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-left text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">
                <th className="pb-2.5">Açıklama</th>
                <th className="pb-2.5 text-right">Adet</th>
                <th className="pb-2.5 text-right">Birim</th>
                <th className="pb-2.5 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {quote.items.map((i) => (
                <tr key={i.id}>
                  <td className="py-3">{i.description}</td>
                  <td className="py-3 text-right">{Number(i.quantity)}</td>
                  <td className="py-3 text-right">
                    {Number(i.unitPrice).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    ₺
                  </td>
                  <td className="py-3 text-right font-medium">
                    {Number(i.lineTotal).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    ₺
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--color-ink)]">
                <td colSpan={3} className="pt-3 text-right font-semibold">
                  Genel toplam
                </td>
                <td className="pt-3 text-right text-lg font-bold">
                  {Number(quote.totalAmount).toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  ₺
                </td>
              </tr>
            </tfoot>
          </table>
          {quote.notes && (
            <p className="mt-4 rounded-xl bg-slate-50 p-3.5 text-sm text-[var(--color-ink-soft)]">
              {quote.notes}
            </p>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="İşlemler" icon={QrCode}>
            <div className="flex flex-col gap-2.5">
              <Button
                icon={FileDown}
                loading={busy === "pdf"}
                onClick={async () => {
                  setBusy("pdf");
                  try {
                    const res = await api<{ publicUrl: string }>(
                      `/api/v1/quotes/${quote.id}/pdf`,
                      { method: "POST" },
                    );
                    setMessage(`PDF oluşturuldu ve S3'e yüklendi. Onay linki: ${res.publicUrl}`);
                    await load();
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                PDF oluştur
              </Button>
              <Button
                variant="secondary"
                icon={MessageCircle}
                loading={busy === "wa"}
                disabled={!quote.customer.phone}
                onClick={async () => {
                  setBusy("wa");
                  try {
                    await api(`/api/v1/quotes/${quote.id}/send-whatsapp`, {
                      method: "POST",
                    });
                    setMessage("Teklif WhatsApp ile gönderildi.");
                    await load();
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                WhatsApp ile gönder
              </Button>
              <a
                href={`/q/${quote.publicToken}`}
                target="_blank"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50"
              >
                <ExternalLink size={16} />
                Onay sayfasını aç
              </a>
            </div>
            {!quote.customer.phone && (
              <p className="mt-3 text-xs text-[var(--color-ink-faint)]">
                WhatsApp göndermek için müşterinin telefon numarası gerekli.
              </p>
            )}
          </Card>

          <Card title="Müşteri">
            <p className="text-sm font-medium">{quote.customer.name}</p>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              {quote.customer.phone || "Telefon yok"}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
