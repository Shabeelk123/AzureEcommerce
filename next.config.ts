import type { NextConfig } from "next";

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
    ],
  },
};

export default nextConfig;
