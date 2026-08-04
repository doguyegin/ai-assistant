"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";
import { api, setTokens } from "@/lib/api";
import { AuthLayout } from "@/components/AuthLayout";
import { Alert, Button, Field, Input } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<{ accessToken: string; refreshToken: string }>(
        "/api/v1/auth/register",
        {
          method: "POST",
          auth: false,
          body: JSON.stringify({ name, email, password }),
        },
      );
      setTokens(data.accessToken, data.refreshToken);
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Hesap oluşturun"
      subtitle="1 dakikada kurulum, kredi kartı gerekmez"
      footer={
        <p className="text-[var(--color-ink-soft)]">
          Zaten hesabınız var mı?{" "}
          <Link href="/login" className="font-medium text-[var(--color-brand)]">
            Giriş yapın
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert tone="rose">{error}</Alert>}
        <Field label="Ad Soyad">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Adınız Soyadınız"
            required
          />
        </Field>
        <Field label="E-posta">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@isletme.com"
            required
          />
        </Field>
        <Field label="Şifre">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="En az 8 karakter"
            minLength={8}
            required
          />
        </Field>
        <Button type="submit" loading={loading} icon={UserPlus} className="w-full">
          Hesap oluştur
        </Button>
      </form>
    </AuthLayout>
  );
}
