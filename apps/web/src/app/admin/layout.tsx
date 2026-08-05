"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { api, getTokens } from "@/lib/api";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";
  const [ready, setReady] = useState(isLogin);

  useEffect(() => {
    if (isLogin) {
      setReady(true);
      return;
    }
    const { accessToken } = getTokens();
    if (!accessToken) {
      router.replace("/admin/login");
      return;
    }
    api<{ user: { isPlatformAdmin: boolean } }>("/api/v1/admin/me")
      .then((d) => {
        if (!d.user.isPlatformAdmin) {
          router.replace("/admin/login");
          return;
        }
        setReady(true);
      })
      .catch(() => router.replace("/admin/login"));
  }, [router, isLogin]);

  if (isLogin) return <>{children}</>;
  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        Yetki kontrol ediliyor…
      </div>
    );
  }
  return <AdminShell>{children}</AdminShell>;
}
