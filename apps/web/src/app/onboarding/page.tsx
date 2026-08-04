"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Building2 } from "lucide-react";
import { api, setTokens } from "@/lib/api";
import { AuthLayout } from "@/components/AuthLayout";
import { Alert, Button, Field, Input } from "@/components/ui";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<{ accessToken: string; refreshToken: string }>(
        "/api/v1/tenants",
        {
          method: "POST",
          body: JSON.stringify({ name, slug, phone, address }),
        },
      );
      setTokens(data.accessToken, data.refreshToken);
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Firma oluşturulamadı");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Firmanızı oluşturun"
      subtitle="Son adım — işletme bilgilerinizi girin"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert tone="rose">{error}</Alert>}
        <Field label="Firma adı">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/ç/g, "c")
                  .replace(/ğ/g, "g")
                  .replace(/ı/g, "i")
                  .replace(/ö/g, "o")
                  .replace(/ş/g, "s")
                  .replace(/ü/g, "u")
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, ""),
              );
            }}
            placeholder="Örn. Yılmaz Oto Lastik"
            required
          />
        </Field>
        <Field label="Kısa ad (URL)">
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            pattern="[a-z0-9\-]+"
            placeholder="yilmaz-oto-lastik"
            required
          />
        </Field>
        <Field label="Telefon">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0555 123 45 67"
          />
        </Field>
        <Field label="Adres">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="İl / İlçe"
          />
        </Field>
        <Button type="submit" loading={loading} icon={Building2} className="w-full">
          Firmayı oluştur ve başla
        </Button>
      </form>
    </AuthLayout>
  );
}
