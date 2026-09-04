# Multi-stage build producing a minimal runtime image for Railway/Render.
# Uses Next.js `output: "standalone"` (see next.config.ts) so the final
# image needs only the traced production dependencies, not the full
# node_modules tree.

FROM node:20-alpine AS base
WORKDIR /app
RUN corepack disable

# ---- deps: install all dependencies (incl. dev, needed to build) ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: generate Prisma client + Next.js production build ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
RUN npx prisma generate
RUN npm run build

# ---- runner: minimal production image -------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma's generated client + migration files, needed at runtime for the
# adapter and for `prisma migrate deploy` run as a release step.
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
