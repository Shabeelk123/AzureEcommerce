import type { NextConfig } from "next";

// Not a nonce-based strict CSP (that needs a per-request nonce threaded
// through proxy.ts into every <script>, a larger change) — this is the
// pragmatic baseline: an explicit allowlist per directive, `unsafe-inline`
// only where Next's own inline bootstrap/style injection requires it.
// checkout.razorpay.com is allowed as a script source and a frame source
// because Razorpay Checkout can render certain payment methods (e.g. some
// bank redirects) in an iframe, not just its own popup.
const CSP = [
  "default-src 'self'",
  // checkout.razorpay.com serves the Checkout bootstrap; cdn.razorpay.com
  // serves bundles Checkout itself loads afterward (e.g. its risk-detection
  // script) — found by actually opening Checkout under this CSP and
  // watching for violations, not guessed from Razorpay's docs alone.
  // 'unsafe-eval' only in dev: Next's dev-mode React Refresh/debugging
  // relies on eval() to reconstruct stack traces across module boundaries.
  // Production never needs it — React itself never calls eval() when built
  // for production, so omitting it there is a real hardening, not a no-op.
  `script-src 'self' 'unsafe-inline' ${
    process.env.NODE_ENV === "development" ? "'unsafe-eval' " : ""
  }https://checkout.razorpay.com https://cdn.razorpay.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // blob: is required for the admin image-upload panel, which reads a
  // just-picked file's dimensions via URL.createObjectURL() before it's
  // ever sent anywhere — without it the browser silently blocks the <img>
  // load under CSP, which reads to the caller as "corrupt file".
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  // *.r2.cloudflarestorage.com is where the admin image-upload panel PUTs
  // file bytes directly from the browser via a presigned URL (see
  // src/lib/storage.ts) — the account-scoped subdomain is dynamic per
  // Cloudflare account, hence the wildcard rather than one fixed host.
  "connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://lumberjack.razorpay.com https://*.r2.cloudflarestorage.com",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  // Redundant with frame-ancestors above for modern browsers, kept for
  // the older browsers that only understand X-Frame-Options.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.razorpay.com\")",
  },
];

const nextConfig: NextConfig = {
  // Minimal, self-contained production build for the Docker image (see
  // Dockerfile) — required for Railway/Render deployment.
  output: "standalone",

  // Opts into Next 16's Cache Components model: explicit `"use cache"` /
  // `<Suspense>` boundaries instead of implicit route-level dynamic/static
  // inference. See node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md.
  cacheComponents: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      // Production CDN hostname for R2_PUBLIC_URL — replace with the real
      // domain once it's provisioned (see .env.example).
      {
        protocol: "https",
        hostname: "cdn.azurehijabs.com",
      },
      // Seed-data placeholder images only (prisma/seed.ts) — next/image
      // 400s on any hostname not explicitly allowlisted here, so this is
      // required for local dev/demo product photos to render at all.
      // Drop once real product photography is uploaded to R2.
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      // Stitch design-preview placeholder photography (AI-generated, not
      // real product photos) used in the shop/home page restyle. Same
      // "temporary until real product photos exist" status as picsum.photos
      // above — drop once real photography is uploaded to R2.
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
