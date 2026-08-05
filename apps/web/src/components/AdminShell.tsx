"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Shield,
  Users,
  X,
} from "lucide-react";
import { clearTokens } from "@/lib/api";

const links = [
  { href: "/admin", label: "Özet", icon: LayoutDashboard },
  { href: "/admin/tenants", label: "Firmalar", icon: Building2 },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/traffic", label: "Trafik", icon: Activity },
  { href: "/admin/audit", label: "Denetim", icon: ScrollText },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {links.map((l) => {
        const active =
          pathname === l.href ||
          (l.href !== "/admin" && pathname.startsWith(l.href));
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Icon size={17} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="mb-8 flex items-center gap-3 px-1">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-700 text-amber-300">
          <Shield size={18} />
        </span>
        <div>
          <p className="text-sm font-bold text-white">Platform Admin</p>
          <p className="text-xs text-slate-500">Sistem yönetimi</p>
        </div>
      </div>
      {nav}
      <button
        className="mt-6 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800/60 hover:text-white"
        onClick={() => {
          clearTokens();
          router.push("/admin/login");
        }}
      >
        <LogOut size={17} />
        Çıkış yap
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col bg-slate-950 p-4 lg:flex">
        {sidebarInner}
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-amber-300">
            <Shield size={15} />
          </span>
          <span className="text-sm font-bold">Platform Admin</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 hover:bg-slate-100"
          aria-label="Menü"
        >
          <Menu size={20} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-slate-950 p-4">
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
