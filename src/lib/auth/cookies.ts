import "server-only";
import { cookies } from "next/headers";
import { env } from "@/env";

// Only callable from Server Actions and Route Handlers (Next.js forbids
// mutating cookies from a Server Component render) — every caller of these
// helpers already lives in one of those two places.

export const ACCESS_TOKEN_COOKIE = "azh_at";
export const REFRESH_TOKEN_COOKIE = "azh_rt";
// Readable by client JS on purpose — a same-lifetime, non-secret marker so
// the client-side silent-refresh loop knows whether it's worth calling
// /api/auth/refresh at all. Never treat its presence as proof of auth; the
// httpOnly cookies are the only thing any server code trusts.
export const AUTH_HINT_COOKIE = "azh_session";
// Deliberately not scoped to /api/auth: logout is a Server Action invoked
// from arbitrary pages, and the browser only attaches a path-scoped cookie
// to requests under that path — a Server Action's request path is the page
// it was called from, not the auth API. httpOnly + Secure + SameSite=Lax
// carry the protection instead.
const COOKIE_PATH = "/";

const isProd = env.NODE_ENV === "production";

export async function setAccessTokenCookie(token: string) {
  (await cookies()).set(ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: 15 * 60,
  });
}

export async function setRefreshTokenCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: COOKIE_PATH,
    expires: expiresAt,
  });
  store.set(AUTH_HINT_COOKIE, "1", {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: COOKIE_PATH,
    expires: expiresAt,
  });
}

export async function getRefreshTokenCookie(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;
}

export async function getAccessTokenCookie(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, "", { path: COOKIE_PATH, maxAge: 0 });
  store.set(REFRESH_TOKEN_COOKIE, "", { path: COOKIE_PATH, maxAge: 0 });
  store.set(AUTH_HINT_COOKIE, "", { path: COOKIE_PATH, maxAge: 0 });
}
