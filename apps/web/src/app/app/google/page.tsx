"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Megaphone,
  Plug,
  Sparkles,
  Star,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
} from "@/components/ui";

type Review = {
  id: string;
  reviewerName: string | null;
  rating: number | null;
  comment: string | null;
  replyText: string | null;
  reviewTime: string | null;
};

type Checklist = {
  score: number;
  checklist: { key: string; label: string; ok: boolean }[];
};

function Stars({ rating }: { rating: number | null }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={
            i < (rating ?? 0)
              ? "fill-amber-400 text-amber-400"
              : "text-slate-300"
          }
        />
      ))}
    </span>
  );
}

export default function GooglePage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [weeklyPost, setWeeklyPost] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const [conn, revs, check] = await Promise.all([
      api<{ connected: boolean; oauthConfigured?: boolean }>(
        "/api/v1/google/connection",
      ),
      api<{ items: Review[] }>("/api/v1/google/reviews"),
      api<Checklist>("/api/v1/google/profile-checklist"),
    ]);
    setConnected(conn.connected);
    setOauthConfigured(Boolean(conn.oauthConfigured));
    setReviews(revs.items);
    setChecklist(check);
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("connected") === "1") {
        setInfo("Google Business hesabı bağlandı.");
      }
    }
    load().catch(console.error);
  }, []);

  async function connectReal() {
    setBusy("connect-real");
    try {
      const res = await api<{ url: string | null; mock?: boolean }>(
        "/api/v1/google/auth-url",
      );
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      setInfo(
        res.mock
          ? "OAuth yapılandırılmadı — demo bağlantı kullanın."
          : "Bağlantı URL alınamadı.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function connectMock() {
    setBusy("connect");
    try {
      await api("/api/v1/google/connect-mock", {
        method: "POST",
        body: "{}",
      });
      setInfo("Google bağlantısı kuruldu (demo).");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function replyWithAi(reviewId: string) {
    setBusy(reviewId);
    try {
      const res = await api<{ reply: string }>(
        `/api/v1/google/reviews/${reviewId}/suggest-reply`,
        { method: "POST", body: "{}" },
      );
      await api(`/api/v1/google/reviews/${reviewId}/reply`, {
        method: "POST",
        body: JSON.stringify({ reply: res.reply }),
      });
      setInfo("Yorum AI ile yanıtlandı.");
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Google Business"
        subtitle="Yorum yönetimi, profil analizi ve haftalık paylaşımlar"
        actions={
          connected === null ? undefined : connected ? (
            <Badge tone="emerald">Bağlı</Badge>
          ) : (
            <Badge tone="amber">Bağlı değil</Badge>
          )
        }
      />

      {info && (
        <div className="mb-5">
          <Alert tone="emerald">{info}</Alert>
        </div>
      )}

      {connected === false && (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Google hesabınızı bağlayın</p>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                Yorumlarınızı görmek ve AI ile yanıtlamak için Google Business
                Profile hesabınızı bağlayın.
                {!oauthConfigured &&
                  " OAuth yoksa demo bağlantıyı kullanabilirsiniz."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {oauthConfigured && (
                <Button
                  icon={Plug}
                  loading={busy === "connect-real"}
                  onClick={connectReal}
                >
                  Google ile bağlan
                </Button>
              )}
              <Button
                variant={oauthConfigured ? "secondary" : "primary"}
                icon={Plug}
                loading={busy === "connect"}
                onClick={connectMock}
              >
                Bağlan (demo)
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          {checklist ? (
            <Card title="Profil analizi" icon={CheckCircle2}>
              <div className="mb-4">
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold">%{checklist.score}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    tamamlandı
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all"
                    style={{ width: `${checklist.score}%` }}
                  />
                </div>
              </div>
              <ul className="space-y-2.5 text-sm">
                {checklist.checklist.map((c) => (
                  <li key={c.key} className="flex items-center gap-2.5">
                    {c.ok ? (
                      <CheckCircle2
                        size={16}
                        className="text-[var(--color-emerald)]"
                      />
                    ) : (
                      <Circle size={16} className="text-slate-300" />
                    )}
                    <span className={c.ok ? "" : "text-[var(--color-ink-soft)]"}>
                      {c.label}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Skeleton className="h-64" />
          )}

          <Card title="Haftalık paylaşım" icon={Megaphone}>
            <p className="mb-4 text-sm text-[var(--color-ink-soft)]">
              AI, işletmeniz için Google Business paylaşım metni üretsin.
            </p>
            <Button
              icon={Sparkles}
              loading={busy === "post"}
              onClick={async () => {
                setBusy("post");
                try {
                  const res = await api<{ post: string }>(
                    "/api/v1/google/weekly-post",
                    {
                      method: "POST",
                      body: JSON.stringify({ topic: "haftalık kampanya" }),
                    },
                  );
                  setWeeklyPost(res.post);
                } finally {
                  setBusy(null);
                }
              }}
            >
              Paylaşım üret
            </Button>
            {weeklyPost && (
              <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed">
                {weeklyPost}
              </pre>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title="Yorumlar" icon={Star}>
            {reviews === null ? (
              <Skeleton className="h-48" />
            ) : reviews.length === 0 ? (
              <EmptyState
                icon={Star}
                title="Yorum yok"
                description="Google hesabınızı bağladığınızda yorumlar burada listelenir."
              />
            ) : (
              <ul className="space-y-4">
                {reviews.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-2xl border border-[var(--color-line)] p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                          {(r.reviewerName ?? "?").slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <p className="text-sm font-semibold">
                            {r.reviewerName ?? "Anonim"}
                          </p>
                          <Stars rating={r.rating} />
                        </div>
                      </div>
                      {r.reviewTime && (
                        <p className="text-xs text-[var(--color-ink-faint)]">
                          {new Date(r.reviewTime).toLocaleDateString("tr-TR")}
                        </p>
                      )}
                    </div>
                    {r.comment && (
                      <p className="mt-3 text-sm leading-relaxed">{r.comment}</p>
                    )}
                    {r.replyText ? (
                      <div className="mt-4 rounded-xl bg-[var(--color-brand-soft)] p-4">
                        <p className="text-xs font-semibold text-[var(--color-brand-dark)]">
                          İşletme yanıtı
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed">
                          {r.replyText}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <Button
                          variant="ghost"
                          icon={Sparkles}
                          loading={busy === r.id}
                          onClick={() => replyWithAi(r.id)}
                        >
                          AI ile yanıtla
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
