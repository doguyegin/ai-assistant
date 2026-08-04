"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { FileText, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  quoteStatusTone,
} from "@/components/ui";

type Quote = {
  id: string;
  title: string;
  status: string;
  totalAmount: string | number;
  createdAt: string;
  customer: { name: string };
};

type Customer = { id: string; name: string };

type ItemRow = { description: string; quantity: string; unitPrice: string };

export default function QuotesPage() {
  const [items, setItems] = useState<Quote[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<ItemRow[]>([
    { description: "", quantity: "1", unitPrice: "" },
  ]);

  async function load() {
    const [q, c] = await Promise.all([
      api<{ items: Quote[] }>("/api/v1/quotes"),
      api<{ items: Customer[] }>("/api/v1/customers?limit=100"),
    ]);
    setItems(q.items);
    setCustomers(c.items);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const total = rows.reduce(
    (s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0),
    0,
  );

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/v1/quotes", {
        method: "POST",
        body: JSON.stringify({
          customerId,
          title,
          items: rows
            .filter((r) => r.description.trim())
            .map((r) => ({
              description: r.description,
              quantity: Number(r.quantity) || 1,
              unitPrice: Number(r.unitPrice) || 0,
            })),
        }),
      });
      setTitle("");
      setCustomerId("");
      setRows([{ description: "", quantity: "1", unitPrice: "" }]);
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Teklifler"
        subtitle="PDF, QR kod ve onay linki ile profesyonel teklifler"
        actions={
          <Button
            icon={showForm ? X : Plus}
            variant={showForm ? "secondary" : "primary"}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Vazgeç" : "Yeni teklif"}
          </Button>
        }
      />

      {showForm && (
        <Card title="Yeni teklif" icon={FileText} className="mb-6 animate-fade-up">
          <form onSubmit={create} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Müşteri *">
                <Select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  <option value="">Müşteri seçin</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Teklif başlığı *">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn. 4 adet yaz lastiği + montaj"
                  required
                />
              </Field>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Kalemler</p>
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Açıklama"
                      value={row.description}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...row, description: e.target.value };
                        setRows(next);
                      }}
                      required={i === 0}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Adet"
                      value={row.quantity}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...row, quantity: e.target.value };
                        setRows(next);
                      }}
                    />
                    <Input
                      className="w-32"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Birim ₺"
                      value={row.unitPrice}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...row, unitPrice: e.target.value };
                        setRows(next);
                      }}
                    />
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRows(rows.filter((_, j) => j !== i))}
                        className="rounded-lg p-2 text-[var(--color-ink-faint)] hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setRows([...rows, { description: "", quantity: "1", unitPrice: "" }])
                }
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand)] hover:underline"
              >
                <Plus size={14} />
                Kalem ekle
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-4">
              <p className="text-sm">
                Toplam:{" "}
                <span className="text-lg font-bold">
                  {total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                </span>
              </p>
              <Button type="submit" loading={saving} icon={FileText}>
                Teklifi oluştur
              </Button>
            </div>
          </form>
        </Card>
      )}

      {items === null ? (
        <Skeleton className="h-64" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Henüz teklif yok"
          description="İlk teklifinizi oluşturun; PDF olarak indirin veya WhatsApp ile gönderin."
          action={
            <Button icon={Plus} onClick={() => setShowForm(true)}>
              İlk teklifi oluştur
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((q) => {
            const st = quoteStatusTone[q.status] ?? {
              tone: "slate" as const,
              label: q.status,
            };
            return (
              <li key={q.id}>
                <Link
                  href={`/app/quotes/${q.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-white px-5 py-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-[var(--shadow-pop)]"
                >
                  <div className="flex items-center gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-teal-soft)] text-[var(--color-teal)]">
                      <FileText size={17} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{q.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
                        {q.customer.name} ·{" "}
                        {new Date(q.createdAt).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {Number(q.totalAmount).toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      ₺
                    </span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
