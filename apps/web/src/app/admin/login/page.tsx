"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Shield } from "lucide-react";
import { api, setTokens } from "@/lib/api";
import { AuthLayout } from "@/components/AuthLayout";
import { Alert, Button, Field, Input } from "@/components/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@aiasistan.app");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<{
        accessToken: string;
        refreshToken: string;
        platformAdmin?: boolean;
      }>("/api/v1/auth/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email, password }),
      });
      if (!data.platformAdmin) {
        setError("Bu hesap platform admin değil");
        return;
      }
      setTokens(data.accessToken, data.refreshToken);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Platform Admin"
      subtitle="Sistem yönetim paneline giriş"
      footer={
        <p className="text-[var(--color-ink-soft)]">
          İşletme paneli için{" "}
          <Link href="/login" className="font-medium text-[var(--color-brand)]">
            buraya gidin
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert tone="rose">{error}</Alert>}
        <Field label="Admin e-posta">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Şifre">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </Field>
        <Button type="submit" loading={loading} icon={Shield} className="w-full">
          Admin girişi
        </Button>
      </form>
    </AuthLayout>
  );
}
