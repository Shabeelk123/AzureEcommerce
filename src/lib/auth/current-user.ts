import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getAccessTokenCookie } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/jwt";
import type { Role } from "@/generated/prisma/enums";

export type CurrentUser = {
  id: string;
  email: string;
  role: Role;
};

/**
 * Reads and verifies the access token cookie. Memoized per request (React
 * `cache`) so calling it from multiple components in one render only reads
 * the cookie once.
 *
 * This reads `cookies()`, so with Cache Components enabled it can only be
 * called from a Server Component that sits behind a `<Suspense>` boundary
 * (or from a Server Action / Route Handler, where no such restriction
 * applies). See node_modules/next/dist/docs/.../authentication-with-cache-components.md.
 *
 * Deliberately does **not** attempt a refresh: minting a new access token
 * mutates cookies, which Next.js only allows from a Server Action or Route
 * Handler, never mid-render. An expired access token here just means
 * "signed out" until the client's silent-refresh call
 * (see src/components/auth-refresh.tsx) or the next explicit login runs.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getAccessTokenCookie();
  const payload = await verifyAccessToken(token);
  if (!payload) return null;
  return { id: payload.sub, email: payload.email, role: payload.role };
});

/** For Server Actions / Route Handlers: returns the user or redirects to /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * For Server Actions / Route Handlers: returns the admin user or redirects.
 * This is the real authorization boundary — `proxy.ts` only does an
 * optimistic, cookie-only pre-filter and must never be trusted alone.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
