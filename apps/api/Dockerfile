FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN npm install --workspace=@ai-assistant/api --workspace=@ai-assistant/shared --include-workspace-root

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w @ai-assistant/shared && npm run db:generate -w @ai-assistant/api && npm run build -w @ai-assistant/api

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/packages/shared ./packages/shared
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/index.js"]
