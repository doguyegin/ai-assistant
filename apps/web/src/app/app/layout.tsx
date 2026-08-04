"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { api, getTokens } from "@/lib/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const { accessToken } = getTokens();
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    api<{ tenant: unknown }>("/api/v1/tenants/me")
      .then((data) => {
        if (!data.tenant) router.replace("/onboarding");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return <AppShell>{children}</AppShell>;
}
