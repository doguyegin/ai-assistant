# AI İşletme Asistanı

Türkiye KOBİ'leri için multi-tenant AI işletme platformu (MVP).

## Stack

- **Web:** Next.js, React, Tailwind, TypeScript
- **API:** Node.js, Express, Socket.IO, BullMQ
- **DB:** PostgreSQL (Prisma)
- **Redis / Meilisearch / MinIO (S3)**

## MVP kapsamı

Login, firma oluşturma, CRM, WhatsApp, Google Business, AI Chat, Dashboard, Hatırlatma, Teklif PDF, firma ayarları.

## Hızlı başlangıç

```bash
# 1) Altyapı (Postgres, Redis, MinIO, Meilisearch)
docker compose up -d

# 2) Bağımlılıklar ve env
cp .env.example .env
cp .env apps/api/.env
# Web için:
# apps/web/.env.local içine NEXT_PUBLIC_API_URL=http://localhost:4000
npm install

# 3) Shared + DB
npm run build -w @ai-assistant/shared
npm run db:generate -w @ai-assistant/api
npm run db:push -w @ai-assistant/api
npm run db:seed -w @ai-assistant/api

# 4) Geliştirme (API + Web — Docker içinde API yok, npm ile çalışır)
npm run dev
```

- Web: http://localhost:3000  
- API: http://localhost:4000/health  

### Demo giriş (seed sonrası)

- E-posta: `demo@aiasistan.app`
- Şifre: `demo12345`

## Mock demo checklist

Anahtarlar boşken bile şu akış çalışır:

1. Seed kullanıcıyla giriş
2. Dashboard
3. Müşteriler (liste / düzenle)
4. Hatırlatma oluştur (uygulama içi)
5. Teklif + PDF (MinIO ayakta olmalı)
6. WhatsApp → mesaj gönder (mock)
7. Google Business → Bağlan (demo)
8. AI Asistan sohbet (mock yanıt)

## Senin yapman gerekenler (gerçek entegrasyon)

1. **JWT** — `.env` ve `apps/api/.env` içinde `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (min 32 karakter)
2. **OpenAI** — `OPENAI_API_KEY` (yoksa mock AI)
3. **Google Cloud OAuth** — `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`; redirect URI’ler:
   - `http://localhost:4000/api/v1/auth/google/callback`
   - `http://localhost:4000/api/v1/google/callback`
4. **Meta WhatsApp Cloud API** — Phone Number ID + Access Token (panelden veya env); webhook için public URL + `WHATSAPP_VERIFY_TOKEN`
5. Anahtarları ekledikten sonra API’yi yeniden başlatıp ilgili sayfalardan gerçek bağlantıyı dene

WhatsApp / Google / OpenAI anahtarları yoksa ilgili servisler **mock** modda çalışır.

## Monorepo

```
apps/web      Next.js panel
apps/api      Express API + workers (lokal: npm run dev)
packages/shared  Zod şemaları + RBAC
```

API Dockerfile opsiyoneldir; varsayılan geliştirme yolu `docker compose` (infra) + `npm run dev` (API/Web).

## Test

```bash
npm run test -w @ai-assistant/api
npm run typecheck
```
