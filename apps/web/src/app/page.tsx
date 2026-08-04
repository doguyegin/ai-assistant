import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Bot,
  FileText,
  MessageCircle,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "CRM",
    text: "Müşteri, araç ve etiket takibi tek ekranda. Plaka ile saniyede arama.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    text: "Şablonlu ve toplu mesajlar, teklif ve hatırlatma gönderimi.",
  },
  {
    icon: Star,
    title: "Google Business",
    text: "Yorumlara AI ile saniyede yanıt, profil analizi ve haftalık paylaşımlar.",
  },
  {
    icon: Bot,
    title: "AI Asistan",
    text: '"Bugün ne yapmalıyım?" diye sorun; işletmenize özel yanıt alın.',
  },
  {
    icon: Bell,
    title: "Hatırlatmalar",
    text: "Bakım, sigorta, muayene ve lastik değişimi otomatik hatırlatılır.",
  },
  {
    icon: FileText,
    title: "Teklif PDF",
    text: "QR kodlu, onay linkli profesyonel teklifler; WhatsApp ile gönderin.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6">
        {/* Nav */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
              <Sparkles size={16} />
            </span>
            <span className="font-bold">AI İşletme Asistanı</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-white"
            >
              Giriş
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--color-brand-dark)]"
            >
              Ücretsiz başla
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="py-16 text-center md:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-[var(--color-brand-soft)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-brand-dark)]">
            <Sparkles size={13} />
            Türkiye&apos;deki KOBİ&apos;ler için · 2026
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Tüm işletmeniz{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              tek panelde
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--color-ink-soft)]">
            Excel, WhatsApp, Google ve müşteri defteri arasında kaybolmayın. CRM,
            mesajlaşma, yorum yönetimi ve yapay zekâ — hepsi bir arada.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand)] px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-[var(--color-brand-dark)]"
            >
              Hemen başla
              <ArrowRight size={17} />
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-[var(--color-line)] bg-white px-6 py-3.5 font-semibold transition hover:bg-slate-50"
            >
              Giriş yap
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                <f.icon size={20} />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                {f.text}
              </p>
            </div>
          ))}
        </section>
      </div>

      <footer className="border-t border-[var(--color-line)] bg-white py-8 text-center text-sm text-[var(--color-ink-soft)]">
        AI İşletme Asistanı · Mobil lastikçiler, oto servisler, kuaförler ve daha
        fazlası için
      </footer>
    </main>
  );
}
