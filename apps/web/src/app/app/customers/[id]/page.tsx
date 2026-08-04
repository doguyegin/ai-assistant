"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Car,
  Mail,
  MapPin,
  Pencil,
  Phone,
  StickyNote,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Skeleton,
  Textarea,
} from "@/components/ui";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  vehiclePlate: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  notes: string | null;
  tags: string[];
  totalSpend: string | number;
  aiScore: number | null;
  createdAt: string;
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    vehiclePlate: "",
    vehicleBrand: "",
    vehicleModel: "",
    vehicleYear: "",
    notes: "",
    tags: "",
  });

  async function load() {
    const c = await api<Customer>(`/api/v1/customers/${params.id}`);
    setCustomer(c);
    setForm({
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      vehiclePlate: c.vehiclePlate ?? "",
      vehicleBrand: c.vehicleBrand ?? "",
      vehicleModel: c.vehicleModel ?? "",
      vehicleYear: c.vehicleYear ? String(c.vehicleYear) : "",
      notes: c.notes ?? "",
      tags: (c.tags ?? []).join(", "),
    });
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [params.id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api(`/api/v1/customers/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          vehiclePlate: form.vehiclePlate || null,
          vehicleBrand: form.vehicleBrand || null,
          vehicleModel: form.vehicleModel || null,
          vehicleYear: form.vehicleYear ? Number(form.vehicleYear) : null,
          notes: form.notes || null,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      setEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) return;
    await api(`/api/v1/customers/${params.id}`, { method: "DELETE" });
    router.push("/app/customers");
  }

  if (error && !customer) return <p className="text-rose-600">{error}</p>;
  if (!customer) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const vehicle = [
    customer.vehicleBrand,
    customer.vehicleModel,
    customer.vehicleYear ? String(customer.vehicleYear) : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <Link
        href="/app/customers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-brand)]"
      >
        <ArrowLeft size={15} />
        Müşterilere dön
      </Link>

      <PageHeader
        title={customer.name}
        subtitle={`Kayıt: ${new Date(customer.createdAt).toLocaleDateString("tr-TR")}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={editing ? X : Pencil}
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Vazgeç" : "Düzenle"}
            </Button>
            <Button variant="secondary" icon={Trash2} onClick={remove}>
              Sil
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-5">
          <Alert tone="rose">{error}</Alert>
        </div>
      )}

      {editing ? (
        <Card title="Müşteri düzenle" icon={Pencil} className="mb-6">
          <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
            <Field label="Ad *">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Telefon">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="E-posta">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Adres">
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
            <Field label="Plaka">
              <Input
                value={form.vehiclePlate}
                onChange={(e) =>
                  setForm({ ...form, vehiclePlate: e.target.value })
                }
              />
            </Field>
            <Field label="Marka">
              <Input
                value={form.vehicleBrand}
                onChange={(e) =>
                  setForm({ ...form, vehicleBrand: e.target.value })
                }
              />
            </Field>
            <Field label="Model">
              <Input
                value={form.vehicleModel}
                onChange={(e) =>
                  setForm({ ...form, vehicleModel: e.target.value })
                }
              />
            </Field>
            <Field label="Yıl">
              <Input
                type="number"
                value={form.vehicleYear}
                onChange={(e) =>
                  setForm({ ...form, vehicleYear: e.target.value })
                }
              />
            </Field>
            <Field label="Etiketler (virgülle)" className="md:col-span-2">
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </Field>
            <Field label="Notlar" className="md:col-span-2">
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </Field>
            <div className="md:col-span-2">
              <Button type="submit" loading={saving}>
                Kaydet
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="İletişim" icon={Phone} className="lg:col-span-1">
              <ul className="space-y-3.5 text-sm">
                <li className="flex items-center gap-3">
                  <Phone size={15} className="text-[var(--color-ink-faint)]" />
                  {customer.phone || "—"}
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={15} className="text-[var(--color-ink-faint)]" />
                  {customer.email || "—"}
                </li>
                <li className="flex items-center gap-3">
                  <MapPin size={15} className="text-[var(--color-ink-faint)]" />
                  {customer.address || "—"}
                </li>
              </ul>
            </Card>

            <Card title="Araç" icon={Car} className="lg:col-span-1">
              {vehicle || customer.vehiclePlate ? (
                <div className="space-y-3">
                  {vehicle && <p className="text-sm font-medium">{vehicle}</p>}
                  {customer.vehiclePlate && (
                    <span className="inline-block rounded-lg border-2 border-slate-800 bg-white px-3 py-1 font-mono text-sm font-bold tracking-widest">
                      {customer.vehiclePlate.toUpperCase()}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-ink-soft)]">
                  Araç bilgisi yok
                </p>
              )}
            </Card>

            <Card title="Finans" icon={Banknote} className="lg:col-span-1">
              <p className="text-2xl font-bold">
                {Number(customer.totalSpend).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}{" "}
                ₺
              </p>
              <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                Toplam harcama
              </p>
              {customer.aiScore != null && (
                <p className="mt-3 text-sm">
                  <Badge tone="teal">AI skoru: {customer.aiScore}</Badge>
                </p>
              )}
            </Card>

            {customer.notes && (
              <Card title="Notlar" icon={StickyNote} className="lg:col-span-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {customer.notes}
                </p>
              </Card>
            )}
          </div>

          <div className="mt-6">
            <Card title="Etiketler" icon={Tag}>
              {customer.tags?.length ? (
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((t) => (
                    <Badge key={t} tone="brand">
                      {t}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-ink-soft)]">Etiket yok</p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
