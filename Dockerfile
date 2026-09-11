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
# --ignore-scripts: package.json's own "postinstall" runs `prisma generate`,
# which needs prisma/schema.prisma — not present in this stage (only the
# manifest/lockfile are, so this layer only invalidates on dependency
# changes, not on every source edit). The builder stage below already runs
# `prisma generate` explicitly once the full source is copied in; running
# it here too would just fail before ever reaching that point.
RUN npm ci --ignore-scripts

# ---- builder: generate Prisma client + Next.js production build ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

# These three MUST be real at build time — no way around it, for two
# different reasons:
#   - DATABASE_URL: this app prerenders pages with Cache Components
#     ("use cache" data fetchers), and `next build` actually executes
#     those fetchers to build the static shell — real Prisma queries run
#     against DATABASE_URL during the build, not just at runtime.
#     DIRECT_URL only needs to be *present* (prisma.config.ts resolves it
#     while loading config for `prisma generate`, which itself never
#     connects), but DATABASE_URL must point at a real, reachable Postgres.
#   - NEXT_PUBLIC_RAZORPAY_KEY_ID: Next.js inlines NEXT_PUBLIC_* vars into
#     the client JS bundle at build time. Unlike server env vars, setting
#     the real value at runtime does nothing after the fact — a wrong
#     value here means the deployed Checkout button is broken until the
#     image is rebuilt. Pass all three as --build-arg (on Render: mark
#     them "available at build time", not just runtime, in the service's
#     environment settings).
ARG DATABASE_URL
ARG DIRECT_URL
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID
ENV DATABASE_URL=${DATABASE_URL}
ENV DIRECT_URL=${DIRECT_URL}
ENV NEXT_PUBLIC_RAZORPAY_KEY_ID=${NEXT_PUBLIC_RAZORPAY_KEY_ID}

# Everything below only needs to be *present* and syntactically valid for
# the build to succeed — never real, and never reaches the running
# container. Several SDKs (Razorpay, Resend) construct a client at
# module-evaluation time, which `next build` touches while tracing routes
# for prerendering, even though nothing here is ever actually called
# during the build. Same convention .github/workflows/ci.yml uses. Each
# Docker stage's environment is independent unless explicitly copied via
# `COPY --from=`, so these placeholders can never leak into the `runner`
# stage — the real values for these come from Render's runtime
# environment variables, set separately on the service. (docker build will
# flag these with a "SecretsUsedInArgOrEnv" lint warning based on the var
# names alone — a false positive here, since the values are intentionally
# fake and build-stage-only; not worth silencing at the cost of clarity.)
ENV AUTH_SECRET=build-time-placeholder-0000000000000000000000
ENV APP_URL=http://localhost:3000
ENV RAZORPAY_KEY_ID=rzp_test_build_placeholder
ENV RAZORPAY_KEY_SECRET=build_placeholder
ENV RAZORPAY_WEBHOOK_SECRET=build_placeholder
ENV RESEND_API_KEY=re_build_placeholder
ENV EMAIL_FROM="AzureHijabs <orders@azurehijabs.com>"
ENV R2_ACCOUNT_ID=build_placeholder
ENV R2_ACCESS_KEY_ID=build_placeholder
ENV R2_SECRET_ACCESS_KEY=build_placeholder
ENV R2_BUCKET=build_placeholder
ENV R2_PUBLIC_URL=https://cdn.example.com
ENV UPSTASH_REDIS_REST_URL=https://build-placeholder.upstash.io
ENV UPSTASH_REDIS_REST_TOKEN=build_placeholder

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
