import "server-only";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@/env";
import type { Role } from "@/generated/prisma/enums";

const secretKey = new TextEncoder().encode(env.AUTH_SECRET);

// Short-lived on purpose: the access token is never revocable once issued,
// so its blast radius (a stolen token usable until expiry) is bounded by
// this window. Session-level revocation (logout, reuse detection) works
// through the refresh token instead — see src/lib/auth/session.ts.
const ACCESS_TOKEN_TTL = "15m";

export type AccessTokenPayload = JWTPayload & {
  sub: string;
  email: string;
  role: Role;
};

export function signAccessToken(payload: {
  userId: string;
  email: string;
  role: Role;
}): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(secretKey);
}

/** Returns the verified payload, or `null` if the token is missing, expired, or tampered. */
export async function verifyAccessToken(
  token: string | undefined,
): Promise<AccessTokenPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}
