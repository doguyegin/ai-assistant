"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Bot,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { api, clearTokens } from "@/lib/api";

const links = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/customers", label: "Müşteriler", icon: Users },
  { href: "/app/reminders", label: "Hatırlatmalar", icon: Bell },
  { href: "/app/quotes", label: "Teklifler", icon: FileText },
  { href: "/app/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/app/google", label: "Google Business", icon: Star },
  { href: "/app/ai", label: "AI Asistan", icon: Bot },
  { href: "/app/settings", label: "Ayarlar", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tenantName, setTenantName] = useState<string>("");

  useEffect(() => {
    api<{ tenant: { name: string } | null }>("/api/v1/tenants/me")
      .then((d) => setTenantName(d.tenant?.name ?? ""))
      .catch(() => {});
  }, []);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {links.map((l) => {
        const active =
          pathname === l.href || (l.href !== "/app" && pathname.startsWith(l.href));
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-[var(--color-brand)] text-white shadow-md shadow-indigo-900/40"
                : "text-slate-400 hover:bg-[var(--color-sidebar-hover)] hover:text-white"
            }`}
          >
            <Icon
              size={17}
              className={
                active
                  ? "text-white"
                  : "text-slate-500 group-hover:text-white"
              }
            />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="mb-8 flex items-center gap-3 px-1">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-900/50">
          <Sparkles size={18} />
        </span>
        <div>
          <p className="text-sm font-bold text-white">AI Asistan</p>
          <p className="max-w-[140px] truncate text-xs text-slate-500">
            {tenantName || "İşletme paneli"}
          </p>
        </div>
      </div>
      {nav}
      <button
        className="mt-6 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-[var(--color-sidebar-hover)] hover:text-white"
        onClick={() => {
          clearTokens();
          router.push("/login");
        }}
      >
        <LogOut size={17} />
        Çıkış yap
      </button>
    </>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col bg-[var(--color-sidebar)] p-4 lg:flex">
        {sidebarInner}
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-line)] bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <Sparkles size={15} />
          </span>
          <span className="text-sm font-bold">AI Asistan</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 hover:bg-slate-100"
          aria-label="Menü"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-[var(--color-sidebar)] p-4">
            <button
              onClick={() => setOpen(false)}
              className="mb-2 self-end rounded-lg p-2 text-slate-400 hover:text-white"
              aria-label="Kapat"
            >
              <X size={18} />
            </button>
            {sidebarInner}
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
        {children}
      </main>
    </div>
  );
}
