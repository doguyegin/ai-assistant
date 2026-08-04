"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Car, Plus, Search, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Skeleton,
  Table,
  Textarea,
} from "@/components/ui";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  vehiclePlate: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  tags: string[];
  totalSpend: string | number;
};

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  vehiclePlate: "",
  vehicleBrand: "",
  vehicleModel: "",
  notes: "",
  tags: "",
};

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[] | null>(null);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await api<{ items: Customer[] }>("/api/v1/customers?limit=100");
    setItems(data.items);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return load();
    const data = await api<{ items: Customer[] }>(
      `/api/v1/customers/search?q=${encodeURIComponent(q)}`,
    );
    setItems(data.items as Customer[]);
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/v1/customers", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          email: form.email || null,
          tags: form.tags
            ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : [],
        }),
      });
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Müşteriler"
        subtitle="CRM — müşteri ve araç kayıtları"
        actions={
          <Button
            icon={showForm ? X : Plus}
            variant={showForm ? "secondary" : "primary"}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Vazgeç" : "Yeni müşteri"}
          </Button>
        }
      />

      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

      {showForm && (
        <Card title="Yeni müşteri" icon={Plus} className="mb-6 animate-fade-up">
          <form onSubmit={create} className="grid gap-4 md:grid-cols-2">
            <Field label="Ad Soyad *">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ahmet Yılmaz"
                required
              />
            </Field>
            <Field label="Telefon">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0555 123 45 67"
              />
            </Field>
            <Field label="E-posta">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ornek@mail.com"
              />
            </Field>
            <Field label="Plaka">
              <Input
                value={form.vehiclePlate}
                onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })}
                placeholder="34 ABC 123"
              />
            </Field>
            <Field label="Araç markası">
              <Input
                value={form.vehicleBrand}
                onChange={(e) => setForm({ ...form, vehicleBrand: e.target.value })}
                placeholder="Toyota"
              />
            </Field>
            <Field label="Model">
              <Input
                value={form.vehicleModel}
                onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
                placeholder="Corolla"
              />
            </Field>
            <Field label="Etiketler (virgülle ayırın)">
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="VIP, filo"
              />
            </Field>
            <Field label="Not" className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ek bilgiler..."
              />
            </Field>
            <div className="md:col-span-2">
              <Button type="submit" loading={saving} icon={Plus}>
                Müşteriyi kaydet
              </Button>
            </div>
          </form>
        </Card>
      )}

      <form onSubmit={search} className="mb-5 flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]"
          />
          <Input
            className="pl-10"
            placeholder="İsim, telefon veya plaka ile arayın..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          Ara
        </Button>
      </form>

      {items === null ? (
        <Skeleton className="h-64" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Müşteri bulunamadı"
          description="Yeni müşteri ekleyin veya farklı bir arama deneyin."
          action={
            <Button icon={Plus} onClick={() => setShowForm(true)}>
              Yeni müşteri
            </Button>
          }
        />
      ) : (
        <Table head={["Müşteri", "Telefon", "Araç", "Etiketler", "Toplam harcama"]}>
          {items.map((c) => (
            <tr key={c.id} className="transition hover:bg-slate-50/70">
              <td className="px-5 py-3.5">
                <Link
                  href={`/app/customers/${c.id}`}
                  className="flex items-center gap-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                    {c.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="font-medium text-[var(--color-brand)] hover:underline">
                    {c.name}
                  </span>
                </Link>
              </td>
              <td className="px-5 py-3.5 text-[var(--color-ink-soft)]">
                {c.phone || "—"}
              </td>
              <td className="px-5 py-3.5">
                {c.vehiclePlate || c.vehicleBrand ? (
                  <span className="inline-flex items-center gap-1.5 text-[var(--color-ink-soft)]">
                    <Car size={14} />
                    {[c.vehicleBrand, c.vehicleModel, c.vehiclePlate]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-5 py-3.5">
                <div className="flex flex-wrap gap-1">
                  {c.tags?.length
                    ? c.tags.map((t) => (
                        <Badge key={t} tone="brand">
                          {t}
                        </Badge>
                      ))
                    : "—"}
                </div>
              </td>
              <td className="px-5 py-3.5 font-medium">
                {Number(c.totalSpend).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}{" "}
                ₺
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
