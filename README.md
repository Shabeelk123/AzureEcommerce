# AzureHijabs

Production e-commerce storefront and admin panel for AzureHijabs, a hijab retailer.
Next.js (App Router) end to end, Postgres via Prisma, Razorpay for payments.

See `docs/plan.md`-equivalent architecture notes in the project plan for the full design
(data model, Razorpay webhook flow, phase breakdown). This README covers day-to-day setup.

## Stack

- **Framework:** Next.js 16 (App Router, Cache Components / `"use cache"`), React 19, TypeScript (strict)
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Database:** PostgreSQL (Neon in production), Prisma ORM 7 (`@prisma/adapter-pg`)
- **Auth:** Hand-rolled email + password, argon2id hashing, JWT access token + rotating
  refresh token in httpOnly cookies
- **Payments:** Razorpay (Orders API + Checkout + webhooks)
- **Email:** Resend + react-email
- **Object storage:** Cloudflare R2 (S3-compatible)
- **Deployment:** Docker image (`output: "standalone"`) on Railway/Render

## Getting started

Prerequisites: Node 20+, Docker Desktop.

```bash
npm install
cp .env.example .env        # fill in real secrets before touching payments/email/storage
docker compose up -d        # local Postgres on localhost:5433
npm run prisma:migrate      # apply migrations
npm run db:seed             # seed categories, products, a coupon, and an admin user
npm run dev
```

The seed prints the admin login (`admin@azurehijabs.com` / a generated password, or set
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` before seeding to control it).

> **Note:** local Postgres is mapped to host port **5433**, not 5432 — many Windows dev
> machines already have a native Postgres service bound to 5432, which would otherwise
> silently swallow connections meant for the Docker container.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also used inside the Docker image) |
| `npm run typecheck` | Generate route types + `tsc --noEmit` |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) — see Phase 5+ |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:deploy` | Apply migrations in CI/production (no schema diffing) |
| `npm run prisma:studio` | Prisma Studio GUI |
| `npm run db:seed` | Re-run the seed (upserts, safe to repeat) |

## Environment variables

All server env vars are parsed and validated once in `src/env.ts` — a missing or malformed
value fails the build rather than surfacing as a runtime crash mid-checkout. See
`.env.example` for the full list and where each value comes from (Neon, Razorpay, Resend,
Cloudflare R2, Upstash).

## Engineering rules this codebase holds to

1. **Money is always integer paise** (`src/lib/money.ts`), never a float number of rupees.
2. **The server recomputes prices** from the DB at checkout — a client never dictates an
   amount that gets charged.
3. **Razorpay's webhook is the source of truth for payment**, not the browser redirect.
   Both converge on one idempotent `fulfilOrder()`.
4. **Inventory decrements are conditional** (`WHERE stock >= qty`) inside the same
   transaction that marks an order paid, so concurrent buyers can't oversell.
5. **Every mutation is a validated server action.** Admin routes are guarded by middleware
   *and* re-checked inside the action — middleware alone is UX, not a security boundary.

## Deployment

Build and run the Docker image directly, or point Railway/Render at the `Dockerfile`:

```bash
docker build -t azurehijabs .
docker run -p 3000:3000 --env-file .env azurehijabs
```

`prisma migrate deploy` should run as a release step before the new container takes traffic.
