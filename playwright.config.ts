import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Auth specs share scarce, serializing resources on a dev machine —
  // argon2 password hashing is deliberately CPU/memory-hard, and several
  // tests log in as the one seeded admin — so run them one at a time
  // rather than racing several real browsers against a single dev server.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  // A little above default: rate-limit and email calls in the auth actions
  // carry their own timeouts (src/lib/rate-limit.ts, src/lib/email.ts) that
  // bound them to a few seconds when Upstash/Resend aren't configured with
  // real credentials, as in local dev — this just covers that margin.
  expect: { timeout: 8_000 },
  timeout: 20_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Assumes a dev server is already running (see README) — CI starts one
  // explicitly rather than relying on Playwright's webServer, since the
  // app needs a migrated, seeded Postgres alongside it.
});
