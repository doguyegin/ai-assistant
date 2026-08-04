"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, FileText, Phone, XCircle } from "lucide-react";
import { API_URL } from "@/lib/api";

type PublicQuote = {
  title: string;
  notes: string | null;
  status: string;
  totalAmount: number | string;
  validUntil: string | null;
  items: {
    id: string;
    description: string;
    quantity: number | string;
    unitPrice: number | string;
    lineTotal: number | string;
  }[];
  customerName: string;
  tenantName: string;
  tenantPhone: string | null;
};

export default function PublicQuotePage() {
  const params = useParams<{ token: string }>();
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState<"accepted" | "rejected" | "">("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/public/quotes/${params.token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Teklif bulunamadı veya süresi dolmuş.");
        return r.json();
      })
      .then((q: PublicQuote) => {
        setQuote(q);
        if (q.status === "accepted") setDone("accepted");
        if (q.status === "rejected") setDone("rejected");
      })
      .catch((e) => setError(e.message));
  }, [params.token]);

  async function respond(action: "accept" | "reject") {
    setBusy(true);
    try {
      const res = await fetch(
        `${API_URL}/api/v1/public/quotes/${params.token}/${action}`,
        { method: "POST" },
      );
      if (res.ok) setDone(action === "accept" ? "accepted" : "rejected");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-rose-700">
          {error}
        </div>
      </main>
    );
  }

  if (!quote) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-[var(--color-ink-soft)]">Yükleniyor...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 via-[var(--color-bg)] to-[var(--color-bg)] p-4 md:p-8">
      <div className="w-full max-w-xl animate-fade-up">
        <div className="overflow-hidden rounded-3xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-pop)]">
          {/* Header */}
          <div className="bg-[var(--color-sidebar)] px-7 py-6 text-white">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
                <FileText size={18} />
              </span>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  {quote.tenantName}
                </p>
                <h1 className="text-lg font-bold">{quote.title}</h1>
              </div>
            </div>
          </div>

          <div className="p-7">
            <p className="text-sm text-[var(--color-ink-soft)]">
              Sayın <span className="font-medium text-[var(--color-ink)]">{quote.customerName}</span>,
              aşağıdaki teklifi inceleyip onaylayabilirsiniz.
            </p>

            <div className="mt-6 divide-y divide-[var(--color-line)] rounded-2xl border border-[var(--color-line)]">
              {quote.items.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between gap-4 px-4.5 p-4 text-sm"
                >
                  <div>
                    <p className="font-medium">{i.description}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
                      {Number(i.quantity)} ×{" "}
                      {Number(i.unitPrice).toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      ₺
                    </p>
                  </div>
                  <p className="font-semibold">
                    {Number(i.lineTotal).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    ₺
                  </p>
                </div>
              ))}
              <div className="flex items-center justify-between bg-slate-50 p-4">
                <p className="text-sm font-semibold">Genel toplam</p>
                <p className="text-xl font-bold">
                  {Number(quote.totalAmount).toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  ₺
                </p>
              </div>
            </div>

            {quote.notes && (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-[var(--color-ink-soft)]">
                {quote.notes}
              </p>
            )}

            {quote.validUntil && (
              <p className="mt-3 text-xs text-[var(--color-ink-faint)]">
                Geçerlilik: {new Date(quote.validUntil).toLocaleDateString("tr-TR")}
              </p>
            )}

            {done === "accepted" ? (
              <div className="mt-7 flex items-center gap-3 rounded-2xl bg-[var(--color-emerald-soft)] p-5 text-[var(--color-emerald)]">
                <CheckCircle2 size={22} />
                <div>
                  <p className="font-semibold">Teklif onaylandı</p>
                  <p className="text-sm opacity-80">
                    Teşekkürler! İşletme en kısa sürede sizinle iletişime geçecek.
                  </p>
                </div>
              </div>
            ) : done === "rejected" ? (
              <div className="mt-7 flex items-center gap-3 rounded-2xl bg-slate-100 p-5 text-slate-600">
                <XCircle size={22} />
                <div>
                  <p className="font-semibold">Teklif reddedildi</p>
                  <p className="text-sm opacity-80">
                    Görüşleriniz için işletmeyle iletişime geçebilirsiniz.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <button
                  disabled={busy}
                  onClick={() => respond("accept")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-emerald)] px-5 py-3.5 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                >
                  <CheckCircle2 size={18} />
                  Teklifi onayla
                </button>
                <button
                  disabled={busy}
                  onClick={() => respond("reject")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-5 py-3.5 font-semibold transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
                >
                  <XCircle size={18} />
                  Reddet
                </button>
              </div>
            )}

            {quote.tenantPhone && (
              <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-[var(--color-ink-faint)]">
                <Phone size={12} />
                Sorularınız için: {quote.tenantPhone}
              </p>
            )}
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-[var(--color-ink-faint)]">
          Bu teklif AI İşletme Asistanı ile oluşturuldu.
        </p>
      </div>
    </main>
  );
}
