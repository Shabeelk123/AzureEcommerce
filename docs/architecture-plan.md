# AzureHijabs — Production E-Commerce Store

## Context

`C:\Users\hp\Documents\GitHub\AzureHijab` is empty. We are building **AzureHijabs**, a
production-grade online store selling hijabs, from scratch. The target is not a demo: it must
handle real money, real inventory, and real customer data with the rigor a senior engineer
would defend in code review — typed end to end, migration-driven schema, idempotent payment
handling, no float arithmetic on money, and tests that actually cover the money path.

**Decisions locked with the user:**

| Area     | Decision                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| Scope    | Full storefront + full admin panel. **Lean v1** — no reviews, wishlist, blog, GST invoices, or shipping-zone engine. |
| Frontend | Next.js App Router, TypeScript strict, Tailwind v4, shadcn/ui                                                        |
| Database | Postgres on **Neon** (serverless), **Prisma** ORM with migrations                                                    |
| Hosting  | **Railway / Render** (Next.js `standalone` in Docker) + **Neon** Postgres                                            |
| Auth     | **Email + password**, argon2 hashing, JWT session in an httpOnly cookie, role-based admin, guest checkout preserved  |
| Payments | **Razorpay** (Orders API + hosted Checkout + webhooks), INR                                                          |

**Environment:** Node v20.19.4, npm 10.8.2, git 2.42, Docker 29 available. Not yet a git repo.

**Why full Next.js rather than React + FastAPI** (considered and rejected): a separate Python
API would mean a second runtime, a second deploy target, a hand-written HTTP layer between two
codebases, and auth split across two stacks — bought for no benefit here. Server Actions
already provide a typed server boundary, and server rendering is what makes product pages
rank. FastAPI would earn its place only if we needed Python specifically (ML, data pipelines)
or one API also serving a mobile client. Keeping all data access behind `src/lib` and
`src/actions` leaves that door open if it ever does.

---

## Architecture

### Non-negotiable engineering rules

These are the rules that separate this from a tutorial build. Every phase below assumes them.

1. **Money is `Int` paise, never `Float`/`Number` rupees.** A `formatINR(paise)` helper in
   `src/lib/money.ts` is the only place division by 100 happens. Razorpay also speaks paise —
   no conversion at the boundary.
2. **The server never trusts a client-sent price.** Cart totals, discounts, and the Razorpay
   order amount are recomputed server-side from the DB at order-creation time.
3. **The webhook is the source of truth for payment**, not the browser callback. The callback
   gives a fast UX redirect; the webhook confirms and fulfils. Both paths converge on one
   idempotent `fulfilOrder()` function.
4. **Every mutation is a server action wrapped in Zod validation** (`next-safe-action`), never
   an unvalidated route handler.
5. **Inventory decrements inside the same transaction** that marks the order paid, with a
   conditional update (`WHERE stock >= qty`) so concurrent buyers cannot oversell.
6. **Admin access is enforced in middleware _and_ re-checked in every admin server action.**
   Middleware alone is not an authorization boundary.

### Data model (`prisma/schema.prisma`)

```
User            id, email(unique), passwordHash, name, phone, role(CUSTOMER|ADMIN),
                emailVerifiedAt, image, failedLoginCount, lockedUntil
Session         userId, refreshTokenHash(unique), userAgent, ip, expiresAt, revokedAt
VerificationToken  userId, tokenHash(unique), purpose(VERIFY_EMAIL|RESET_PASSWORD), expiresAt
Address         userId?, fullName, phone, line1, line2, city, state, pincode, country, isDefault

Category        slug(unique), name, description, image, sortOrder
Collection      slug(unique), name, heroImage, isFeatured        // "Everyday Jersey", "Eid Edit"
Product         slug(unique), title, description(rich), categoryId, collectionIds[],
                status(DRAFT|ACTIVE|ARCHIVED), fabric, careInstructions,
                basePricePaise, compareAtPaise?, seoTitle, seoDescription, publishedAt
ProductImage    productId, url, alt, width, height, sortOrder
ProductVariant  productId, sku(unique), colorName, colorHex, size?, length?,
                pricePaise (override), stock(Int), lowStockThreshold, weightGrams, isActive
                @@unique([productId, colorName, size])

Cart            id, userId?, sessionToken?(unique), expiresAt
CartItem        cartId, variantId, quantity   @@unique([cartId, variantId])

Coupon          code(unique), type(PERCENT|FIXED), value, minSubtotalPaise,
                maxRedemptions, redemptionCount, startsAt, endsAt, isActive

Order           id, orderNumber(unique, human "AZH-2026-00042"), userId?, email, phone,
                status(PENDING|PAID|PACKED|SHIPPED|DELIVERED|CANCELLED|REFUNDED),
                subtotalPaise, discountPaise, shippingPaise, totalPaise, couponCode?,
                shippingAddress(Json snapshot), billingAddress(Json snapshot),
                razorpayOrderId(unique), notes, placedAt, paidAt
OrderItem       orderId, variantId?, // nullable: variant may later be deleted
                productTitle, variantLabel, sku, unitPricePaise, quantity, imageUrl
                // denormalized snapshot — an order must render correctly forever
Payment         orderId, razorpayPaymentId(unique), method, amountPaise, status,
                capturedAt, rawPayload(Json)
Refund          paymentId, razorpayRefundId(unique), amountPaise, reason, status

WebhookEvent    provider, eventId(unique), type, payload(Json), processedAt
                // the idempotency ledger — insert-first, then process
AuditLog        actorId, action, entity, entityId, diff(Json), createdAt
```

`OrderItem` stores a **snapshot** of product data deliberately: renaming a product or deleting
a variant must never rewrite a customer's past order.

### Route structure

```
src/app/
  (shop)/
    page.tsx                       home — hero, featured collections, new arrivals
    shop/page.tsx                  all products + filters (category, color, fabric, price, sort)
    shop/[categorySlug]/page.tsx
    collections/[slug]/page.tsx
    product/[slug]/page.tsx        variant picker, gallery, size guide, stock state
    cart/page.tsx
    checkout/page.tsx              address → review → Razorpay
    checkout/success/[orderNumber]/page.tsx
    account/(orders|addresses|profile)/page.tsx
    (legal)/(privacy|terms|shipping|returns)/page.tsx
    search/page.tsx
  (admin)/admin/
    page.tsx                       dashboard: revenue, orders today, low stock, top products
    products/(page|new|[id]/edit)  incl. variant matrix editor + image uploads
    orders/(page|[id])             status transitions, refund action
    inventory/page.tsx             bulk stock edit, low-stock view
    categories/, collections/, coupons/, customers/, settings/
  api/
    webhooks/razorpay/route.ts     raw-body signature verification, idempotent
    auth/refresh/route.ts          rotate refresh token → new access cookie
    health/route.ts                readiness probe for Railway/Render
  sitemap.ts  robots.ts  opengraph-image.tsx
src/
  actions/      cart.ts checkout.ts account.ts admin/*.ts   (all next-safe-action + Zod)
  lib/          prisma.ts auth/(password|jwt|session|guards).ts razorpay.ts money.ts
                cart.ts inventory.ts rate-limit.ts storage.ts email.ts validators/*.ts
  components/   ui/ (shadcn), shop/, admin/
  emails/       react-email templates
prisma/         schema.prisma  migrations/  seed.ts
tests/          unit/ (vitest)  e2e/ (playwright)
```

### Razorpay flow (the critical path)

1. **Create order** — server action `placeOrder`: validate address + cart with Zod, re-price
   every line from the DB, validate the coupon, compute shipping, create `Order(PENDING)` +
   `OrderItem[]` in a transaction, then call Razorpay Orders API with `amount = totalPaise`,
   `receipt = orderNumber`, `notes = { orderId }`. Persist `razorpayOrderId`.
2. **Pay** — client opens Razorpay Checkout with the order id and the _public_ key only.
3. **Callback** — browser posts `razorpay_payment_id/order_id/signature` to a server action
   that verifies `HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET)`. On success it calls
   `fulfilOrder()` and redirects to the success page. On failure → retry page.
4. **Webhook** — `POST /api/webhooks/razorpay` reads the **raw body**
   (`await req.text()`, no JSON parse before verifying), verifies
   `x-razorpay-signature` against `RAZORPAY_WEBHOOK_SECRET`, inserts `WebhookEvent` on a unique
   `eventId` (a duplicate insert = already processed, return 200 immediately), then handles
   `payment.captured` → `fulfilOrder()`, `payment.failed`, `refund.processed`.
5. **`fulfilOrder(orderId, payment)`** — one transaction, safe to call twice:
   if `order.status !== PENDING` return; create `Payment`; for each item
   `UPDATE variant SET stock = stock - qty WHERE id = ? AND stock >= qty` — if any row count is
   0, mark the order `PAID` but flag it `needsReview` for admin (money is taken; never silently
   drop it); increment coupon redemption; set `PAID`/`paidAt`; clear the cart; queue the
   confirmation email; revalidate product tags.

Amount, currency, and `notes.orderId` from the webhook are **re-checked against the DB order**
before fulfilment — a forged-but-signed event for another merchant order must not fulfil ours.

### Third-party services to provision

| Purpose    | Service                   | Env vars                                                                                           |
| ---------- | ------------------------- | -------------------------------------------------------------------------------------------------- |
| Database   | Neon Postgres             | `DATABASE_URL` (pooled), `DIRECT_URL` (migrations)                                                 |
| Payments   | Razorpay                  | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` |
| Auth       | Own JWT sessions (argon2) | `AUTH_SECRET`, `APP_URL`                                                                           |
| Email      | Resend + react-email      | `RESEND_API_KEY`, `EMAIL_FROM`                                                                     |
| Images     | Cloudflare R2 (S3 API)    | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`          |
| Rate limit | Upstash Redis             | `UPSTASH_REDIS_REST_URL/TOKEN`                                                                     |
| Errors     | Sentry                    | `SENTRY_DSN`                                                                                       |

All parsed once through `src/env.ts` (`@t3-oss/env-nextjs` + Zod) so a missing var fails the
build, not a customer's checkout.

---

## Implementation phases

Each phase ends in a working, committed, type-checking state.

### Phase 0 — Foundation

`git init`; `create-next-app` (TypeScript, App Router, Tailwind v4, src dir, ESLint);
add Prettier + `eslint-config-next` strict, `tsconfig` with `strict: true` and
`noUncheckedIndexedAccess`; init shadcn/ui; add `src/env.ts`, `.env.example`,
`.gitignore`; `docker-compose.yml` with Postgres 16 for local dev; multi-stage `Dockerfile`
using Next.js `output: "standalone"` for Railway/Render, with `/api/health` as the healthcheck;
GitHub Actions CI running typecheck → lint → unit tests → build.

### Phase 1 — Data layer

Full `prisma/schema.prisma` as above; `src/lib/prisma.ts` singleton (globalThis guard for
HMR, `@prisma/adapter-neon` for serverless pooling); first migration; `prisma/seed.ts` with
~12 realistic hijab products (chiffon, jersey, georgette, modal, satin — multiple colorways),
categories, collections, a coupon, and an admin user; `src/lib/money.ts` with
`formatINR`, `rupeesToPaise`, `paiseToRupees` + unit tests.

### Phase 2 — Auth & accounts

Hand-rolled, deliberately conventional: **argon2id** password hashing (`@node-rs/argon2`);
signup → emailed verification link; login issues a short-lived (15 min) **access JWT** and a
long-lived opaque **refresh token**, both `httpOnly; Secure; SameSite=Lax`, with the refresh
token stored only as a hash in `Session` and **rotated on every use** (reuse of a rotated token
revokes the whole session family); password reset via single-use hashed token; per-IP and
per-account rate limiting plus lockout on repeated failures; `Role` claim in the access token.
`middleware.ts` protects `/admin/*` (ADMIN only) and `/account/*`; `src/lib/auth/guards.ts`
exports `requireUser()` / `requireAdmin()`, called inside **every** protected server action —
middleware is UX, the guard is the security boundary. Then account profile + address book CRUD.

### Phase 3 — Catalog storefront

Product listing with server-side filtering & pagination via searchParams (category, color,
fabric, price range, sort) — filters live in the URL so they're shareable and cacheable.
Product detail page with variant selector (color swatches × size), image gallery with
`next/image`, stock/low-stock/out-of-stock states, size guide, related products.
ISR via `unstable_cache` + tag-based revalidation on admin writes. Postgres full-text search
(`tsvector` GIN index on title/description/fabric) for `/search` — no external search service
needed at this scale. JSON-LD `Product` schema, `generateMetadata`, OG images, `sitemap.ts`.

### Phase 4 — Cart

Server-persisted cart: `sessionToken` in an httpOnly cookie for guests, `userId` when signed
in, **merged on login** (union of items, quantities capped at stock). Optimistic add/update/
remove via server actions + `useOptimistic`. Cart drawer + full cart page. Stock re-validated
on every read so a cart never shows a purchasable out-of-stock line.

### Phase 5 — Checkout & Razorpay

Address form (Zod: 6-digit pincode, 10-digit Indian mobile), saved-address picker, coupon
application, order summary with flat shipping + free-shipping threshold from settings.
`placeOrder` action, Razorpay Checkout script loaded via `next/script`, callback verification,
webhook route, `fulfilOrder()`, success page, retry-payment path for `PENDING` orders.
Rate limiting on `placeOrder` and OTP requests via Upstash.

### Phase 6 — Orders & transactional email

Customer order history + detail with a status timeline; react-email templates (order
confirmation, shipped, cancelled, refunded) sent via Resend; admin order detail with status
transitions, tracking number entry, cancel, and Razorpay refund (full/partial) writing a
`Refund` row.

### Phase 7 — Admin panel

Dashboard (revenue/orders/AOV over selectable range, low-stock list, recent orders);
product CRUD with a variant matrix editor and drag-reorder image uploads to R2 via presigned
PUT URLs (the browser uploads straight to R2; the server only signs and records);
category/collection/coupon CRUD; customer list; bulk inventory editing; settings (shipping
flat rate, free-shipping threshold, store contact); `AuditLog` written on every admin
mutation. Every admin action re-asserts `requireAdmin()`.

### Phase 8 — Hardening & polish

Security headers + CSP in `next.config.ts` (allowing `checkout.razorpay.com`), CSRF-safe
actions, `robots.ts`, 404/500 pages, `loading.tsx` skeletons and `error.tsx` boundaries per
route group, accessibility pass (keyboard nav, focus rings, labelled swatches, contrast),
Lighthouse ≥ 95 on product and listing pages, Sentry wiring, `README.md` with setup +
runbook, and a brand pass on the azure palette (design tokens in `globals.css`).

---

## Verification

**Automated**

- `npm run typecheck && npm run lint` — clean, zero `any` in `src/`.
- `npm run test` (Vitest): money helpers, coupon math, shipping calc, cart merge logic,
  Razorpay signature verification (valid/invalid/tampered), and `fulfilOrder()` idempotency —
  calling it twice must produce one `Payment` row and one stock decrement.
- `npm run test:e2e` (Playwright, against local Postgres + seeded data):
  browse → filter → open product → select variant → add to cart → guest checkout →
  Razorpay **test mode** payment → success page shows the order → order appears in admin →
  stock decreased by the ordered quantity. Plus an auth suite: signup, verify, login, refresh
  rotation, reuse-detection revoking the family, reset password, and lockout.
- CI runs all of the above on every push.

**Manual, before go-live**

1. `docker compose up -d && npx prisma migrate dev && npx prisma db seed && npm run dev`.
2. Pay with Razorpay test cards (success, failure, and a card that requires 3-D Secure).
3. Replay a captured webhook twice with `razorpay` test events (or curl with a computed
   signature) — confirm the second is a no-op returning 200 and stock is unchanged.
4. Send a webhook with a **bad signature** — must return 400 and write nothing.
5. Two browsers buy the last unit of one variant simultaneously — exactly one succeeds; the
   other is refunded/flagged, never oversold.
6. Sign in as a guest with items in the cart — cart merges, doesn't vanish.
7. Hit `/admin` as a CUSTOMER — redirected, and the underlying server action also refuses.
8. Build the Docker image locally, run it against a Neon branch, then deploy to Railway/Render
   staging, point a Razorpay test webhook at it, and run the full purchase once more end to
   end before switching to live keys.

**Definition of done:** a real INR payment in live mode produces a `PAID` order, a decremented
stock count, a confirmation email, and a matching Razorpay dashboard entry — with the webhook
replayed twice and nothing double-counted.
