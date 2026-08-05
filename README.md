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



## Test

```bash
npm run test -w @ai-assistant/api
npm run typecheck
```
