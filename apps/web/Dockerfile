FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm install --workspace=@ai-assistant/web --workspace=@ai-assistant/shared --include-workspace-root

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w @ai-assistant/shared && npm run build -w @ai-assistant/web

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/package.json ./apps/web/
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
