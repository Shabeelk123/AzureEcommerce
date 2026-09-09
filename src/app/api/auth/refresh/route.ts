import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signAccessToken } from "@/lib/auth/jwt";
import { SessionReuseError, rotateRefreshToken } from "@/lib/auth/session";
import {
  clearAuthCookies,
  getRefreshTokenCookie,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "@/lib/auth/cookies";

/**
 * Mints a new access token from the refresh cookie and rotates the refresh
 * token. Called by the client-side silent-refresh loop (see
 * src/components/auth-refresh.tsx) roughly every 10 minutes — NOT from
 * `proxy.ts` on every navigation, which would turn every prefetch into a
 * database write and make concurrent tabs race each other into false
 * reuse-detection lockouts.
 */
export async function POST() {
  const refreshToken = await getRefreshTokenCookie();
  if (!refreshToken) {
    return Response.json({ ok: false }, { status: 401 });
  }

  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
    const rotated = await rotateRefreshToken(refreshToken, {
      userAgent: h.get("user-agent"),
      ip,
    });

    if (!rotated) {
      await clearAuthCookies();
      return Response.json({ ok: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: rotated.userId } });
    if (!user) {
      await clearAuthCookies();
      return Response.json({ ok: false }, { status: 401 });
    }

    const accessToken = await signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    await setAccessTokenCookie(accessToken);
    await setRefreshTokenCookie(rotated.refreshToken, rotated.expiresAt);

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof SessionReuseError) {
      // The presented refresh token had already been used once before —
      // treat as a stolen/replayed token, sign this browser fully out.
      console.warn("[auth] refresh token reuse detected, family revoked", {
        familyId: error.familyId,
      });
    } else {
      console.error("[auth] refresh failed", error);
    }
    await clearAuthCookies();
    return Response.json({ ok: false }, { status: 401 });
  }
}
