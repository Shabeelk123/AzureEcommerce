import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Every environment variable the app touches is parsed once, here, at
 * startup. A missing or malformed value fails the build / boot instead of
 * surfacing as a runtime crash mid-checkout.
 */
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    DATABASE_URL: z.url(),
    DIRECT_URL: z.url(),

    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
    APP_URL: z.url(),

    RAZORPAY_KEY_ID: z.string().min(1),
    RAZORPAY_KEY_SECRET: z.string().min(1),
    RAZORPAY_WEBHOOK_SECRET: z.string().min(1),

    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(1),

    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET: z.string().min(1),
    R2_PUBLIC_URL: z.url(),

    UPSTASH_REDIS_REST_URL: z.url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

    SENTRY_DSN: z.string().optional(),

    // Bearer token for the bulk product-import API
    // (src/app/api/admin/products/import/route.ts) — a separate secret
    // from AUTH_SECRET so an automation tool (e.g. n8n) can be revoked
    // independently of user sessions. Optional so existing deploys don't
    // fail validation until one is set; the route itself refuses to run
    // without it configured.
    PRODUCT_IMPORT_API_KEY: z.string().min(16).optional(),
  },
  client: {
    NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
});
