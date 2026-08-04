"use client";

import { type ReactNode } from "react";
import { Loader2, type LucideIcon } from "lucide-react";

/* ---------- Page header ---------- */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-[var(--color-ink-soft)]">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Card ---------- */

export function Card({
  children,
  className = "",
  title,
  icon: Icon,
  actions,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] ${className}`}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                <Icon size={16} />
              </span>
            )}
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

/* ---------- Buttons ---------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)] shadow-sm",
  secondary:
    "border border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:bg-slate-50",
  ghost: "text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]",
  danger: "bg-[var(--color-rose)] text-white hover:opacity-90",
};

export function Button({
  children,
  variant = "primary",
  loading = false,
  icon: Icon,
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: LucideIcon;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${buttonStyles[variant]} ${className}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

/* ---------- Form fields ---------- */

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1.5 block font-medium text-[var(--color-ink)]">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)]";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

/* ---------- Badge ---------- */

type BadgeTone = "brand" | "teal" | "amber" | "rose" | "emerald" | "slate";

const badgeTones: Record<BadgeTone, string> = {
  brand: "bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]",
  teal: "bg-[var(--color-teal-soft)] text-[var(--color-teal)]",
  amber: "bg-[var(--color-amber-soft)] text-[var(--color-amber)]",
  rose: "bg-[var(--color-rose-soft)] text-[var(--color-rose)]",
  emerald: "bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]",
  slate: "bg-slate-100 text-slate-600",
};

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

export const quoteStatusTone: Record<string, { tone: BadgeTone; label: string }> = {
  draft: { tone: "slate", label: "Taslak" },
  sent: { tone: "brand", label: "Gönderildi" },
  viewed: { tone: "amber", label: "Görüntülendi" },
  accepted: { tone: "emerald", label: "Onaylandı" },
  rejected: { tone: "rose", label: "Reddedildi" },
  expired: { tone: "slate", label: "Süresi doldu" },
};

export const reminderStatusTone: Record<string, { tone: BadgeTone; label: string }> = {
  pending: { tone: "amber", label: "Bekliyor" },
  sent: { tone: "brand", label: "Gönderildi" },
  completed: { tone: "emerald", label: "Tamamlandı" },
  cancelled: { tone: "slate", label: "İptal" },
};

export const reminderTypeLabel: Record<string, string> = {
  maintenance: "Bakım",
  insurance: "Sigorta",
  inspection: "Muayene",
  tire: "Lastik",
  appointment: "Randevu",
  general: "Genel",
};

/* ---------- Stat card ---------- */

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: BadgeTone;
  hint?: string;
}) {
  const iconTone: Record<BadgeTone, string> = {
    brand: "bg-[var(--color-brand-soft)] text-[var(--color-brand)]",
    teal: "bg-[var(--color-teal-soft)] text-[var(--color-teal)]",
    amber: "bg-[var(--color-amber-soft)] text-[var(--color-amber)]",
    rose: "bg-[var(--color-rose-soft)] text-[var(--color-rose)]",
    emerald: "bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="animate-fade-up rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-ink-soft)]">
          {label}
        </p>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${iconTone[tone]}`}>
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--color-ink-faint)]">{hint}</p>}
    </div>
  );
}

/* ---------- Empty state ---------- */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-line)] bg-white/50 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
        <Icon size={22} />
      </span>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-[var(--color-ink-soft)]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------- Skeleton ---------- */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse-soft rounded-lg bg-slate-200/70 ${className}`} />
  );
}

/* ---------- Alert ---------- */

export function Alert({
  tone = "brand",
  children,
}: {
  tone?: "brand" | "rose" | "emerald" | "amber";
  children: ReactNode;
}) {
  const tones = {
    brand: "bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)] border-indigo-200",
    rose: "bg-[var(--color-rose-soft)] text-[var(--color-rose)] border-rose-200",
    emerald: "bg-[var(--color-emerald-soft)] text-[var(--color-emerald)] border-emerald-200",
    amber: "bg-[var(--color-amber-soft)] text-[var(--color-amber)] border-amber-200",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>
  );
}

/* ---------- Table ---------- */

export function Table({
  head,
  children,
}: {
  head: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-line)] bg-slate-50/70 text-left">
            {head.map((h) => (
              <th
                key={h}
                className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-line)]">{children}</tbody>
      </table>
    </div>
  );
}
