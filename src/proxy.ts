import { NextResponse, type NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

/**
 * Optimistic, cookie-only auth gate (Proxy = Next 16's renamed Middleware).
 * This is a UX pre-filter, NOT the security boundary — it only checks the
 * access token's signature and expiry, never the database, so it must
 * never be trusted alone. Every admin/account Server Action re-checks via
 * requireUser()/requireAdmin() (src/lib/auth/current-user.ts), which is
 * the actual authorization boundary.
 *
 * Deliberately does not attempt token refresh here — see the comment in
 * src/app/api/auth/refresh/route.ts for why that belongs in a client-driven
 * poll instead of every proxied request.
 */
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const payload = await verifyAccessToken(token);

  if (pathname.startsWith("/admin")) {
    if (!payload) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/account")) {
    if (!payload) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (AUTH_ROUTES.includes(pathname) && payload) {
    return NextResponse.redirect(
      new URL(payload.role === "ADMIN" ? "/admin" : "/account", request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/account/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ],
};
