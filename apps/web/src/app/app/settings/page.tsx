"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Save } from "lucide-react";
import { api } from "@/lib/api";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Skeleton,
} from "@/components/ui";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
};

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    logoUrl: "",
  });

  useEffect(() => {
    api<{ tenant: Tenant | null }>("/api/v1/tenants/me")
      .then((d) => {
        if (!d.tenant) return;
        setTenant(d.tenant);
        setForm({
          name: d.tenant.name,
          phone: d.tenant.phone ?? "",
          address: d.tenant.address ?? "",
          logoUrl: d.tenant.logoUrl ?? "",
        });
      })
      .catch((e) => setError(e.message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setInfo("");
    try {
      const res = await api<{ tenant: Tenant }>("/api/v1/tenants/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || null,
          address: form.address || null,
          logoUrl: form.logoUrl || null,
        }),
      });
      setTenant(res.tenant);
      setInfo("Firma bilgileri güncellendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  if (!tenant && !error) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Firma ayarları"
        subtitle={tenant ? `Slug: ${tenant.slug}` : "İşletme profilinizi düzenleyin"}
      />

      {info && (
        <div className="mb-5">
          <Alert tone="emerald">{info}</Alert>
        </div>
      )}
      {error && (
        <div className="mb-5">
          <Alert tone="rose">{error}</Alert>
        </div>
      )}

      <Card title="Profil" icon={Building2}>
        <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
          <Field label="İşletme adı *">
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
              placeholder="0555 123 45 67"
            />
          </Field>
          <Field label="Adres">
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="İl / İlçe"
            />
          </Field>
          <Field label="Logo URL">
            <Input
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="https://..."
            />
          </Field>
          {form.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.logoUrl}
              alt="Logo önizleme"
              className="h-16 w-16 rounded-xl object-cover border border-[var(--color-line)]"
            />
          )}
          <div>
            <Button type="submit" loading={saving} icon={Save}>
              Kaydet
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
