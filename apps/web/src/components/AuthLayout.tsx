"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-[var(--color-sidebar)] lg:block">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg">
              <Sparkles size={18} />
            </span>
            <span className="font-bold text-white">AI İşletme Asistanı</span>
          </Link>
          <div>
            <h2 className="max-w-md text-3xl font-bold leading-snug text-white">
              İşletmenizi tek panelden yönetin.
            </h2>
            <p className="mt-4 max-w-md text-slate-400">
              CRM, WhatsApp, Google Business ve yapay zekâ — Excel&apos;e ve dağınık
              uygulamalara veda edin.
            </p>
            <div className="mt-8 flex gap-6 text-sm text-slate-500">
              <div>
                <p className="text-xl font-bold text-white">%100</p>
                <p>Tenant izolasyonu</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">7/24</p>
                <p>AI asistan</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">1 dk</p>
                <p>Kurulum</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600">© 2026 AI İşletme Asistanı</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md animate-fade-up">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <Sparkles size={16} />
            </span>
            <span className="font-bold">AI İşletme Asistanı</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-[var(--color-ink-soft)]">{subtitle}</p>
          )}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm">{footer}</div>}
        </div>
      </div>
    </main>
  );
}
