"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setTokens } from "@/lib/api";

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      router.replace("/app");
    } else {
      router.replace("/login");
    }
  }, [params, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 text-[var(--color-ink-soft)]">
        <Loader2 size={18} className="animate-spin" />
        Giriş tamamlanıyor...
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
