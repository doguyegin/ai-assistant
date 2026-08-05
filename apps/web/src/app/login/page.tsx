"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { API_URL, api, setTokens } from "@/lib/api";
import { AuthLayout } from "@/components/AuthLayout";
import { Alert, Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);

  useEffect(() => {
    api<{ google: boolean }>("/api/v1/auth/providers", { auth: false })
      .then((d) => setGoogleConfigured(d.google))
      .catch(() => setGoogleConfigured(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<{
        accessToken: string;
        refreshToken: string;
        tenantId: string | null;
        platformAdmin?: boolean;
      }>("/api/v1/auth/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email, password }),
      });
      setTokens(data.accessToken, data.refreshToken);
      if (data.platformAdmin) {
        router.push("/admin");
        return;
      }
      router.push(data.tenantId ? "/app" : "/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  }

  async function googleLogin() {
    setLoading(true);
    setError("");
    try {
      if (googleConfigured) {
        const data = await api<{ url: string }>("/api/v1/auth/google", {
          auth: false,
        });
        window.location.href = data.url;
        return;
      }
      const data = await api<{
        accessToken: string;
        refreshToken: string;
        tenantId: string | null;
      }>("/api/v1/auth/google/mock", {
        method: "POST",
        auth: false,
        body: JSON.stringify({
          email: "demo@aiasistan.app",
          name: "Demo Kullanıcı",
        }),
      });
      setTokens(data.accessToken, data.refreshToken);
      router.push(data.tenantId ? "/app" : "/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google girişi başarısız");
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Tekrar hoş geldiniz"
      subtitle="Hesabınıza giriş yapın"
      footer={
        <p className="text-[var(--color-ink-soft)]">
          Hesabınız yok mu?{" "}
          <Link href="/register" className="font-medium text-[var(--color-brand)]">
            Ücretsiz kayıt olun
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert tone="rose">{error}</Alert>}
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
            placeholder="••••••••"
            required
          />
        </Field>
        <Button type="submit" loading={loading} icon={LogIn} className="w-full">
          Giriş yap
        </Button>
        <div className="relative py-1 text-center text-xs text-[var(--color-ink-faint)]">
          <span className="relative z-10 bg-[var(--color-bg)] px-3 lg:bg-white">
            veya
          </span>
          <span className="absolute left-0 top-1/2 h-px w-full bg-[var(--color-line)]" />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={googleLogin}
          loading={loading}
          className="w-full"
        >
          {googleConfigured
            ? "Google ile devam et"
            : "Google ile devam et (demo)"}
        </Button>
        {!googleConfigured && (
          <p className="text-center text-xs text-[var(--color-ink-faint)]">
            OAuth yapılandırılmadı — demo giriş kullanılır ({API_URL})
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
