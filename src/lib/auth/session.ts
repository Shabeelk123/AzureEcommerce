import "server-only";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export class SessionReuseError extends Error {
  constructor(public readonly familyId: string) {
    super("Refresh token reuse detected — session family revoked.");
    this.name = "SessionReuseError";
  }
}

function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SessionMeta = {
  userAgent?: string | null;
  ip?: string | null;
};

/**
 * Starts a brand new session family (login, signup). Returns the opaque
 * refresh token to set as a cookie — only its hash is ever persisted.
 */
export async function createSessionFamily(userId: string, meta: SessionMeta = {}) {
  const familyId = randomUUID();
  const refreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      familyId,
      refreshTokenHash: hashToken(refreshToken),
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
      expiresAt,
    },
  });

  return { refreshToken, familyId, expiresAt };
}

/**
 * Validates and rotates a refresh token. Rotation is: mark the presented
 * session revoked, insert a fresh row in the same family. The old row is
 * never deleted — that's what lets a *second* presentation of the same
 * (now-revoked) token be recognized as reuse rather than simply "unknown",
 * so we can respond by revoking every session in the family, not just this
 * one. Safe to call concurrently for the same token: the loser of the race
 * hits `count: 0` on the conditional update and is treated as reuse too,
 * which just means the caller retries login — an acceptable cost for
 * closing the replay window.
 */
export async function rotateRefreshToken(rawToken: string, meta: SessionMeta = {}) {
  const tokenHash = hashToken(rawToken);
  const existing = await prisma.session.findUnique({
    where: { refreshTokenHash: tokenHash },
  });

  if (!existing) {
    return null; // Unknown token: not a session we ever issued (or long since pruned).
  }

  if (existing.revokedAt || existing.expiresAt < new Date()) {
    // Either explicitly revoked (logout, admin action) or already rotated
    // away and presented again — both are treated as reuse: nuke the family.
    await revokeFamily(existing.familyId);
    throw new SessionReuseError(existing.familyId);
  }

  const newRefreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const revocation = await prisma.session.updateMany({
    where: { id: existing.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (revocation.count === 0) {
    // Lost a concurrent rotation race — someone else already rotated this
    // exact row between our read and write. Treat as reuse.
    await revokeFamily(existing.familyId);
    throw new SessionReuseError(existing.familyId);
  }

  await prisma.session.create({
    data: {
      userId: existing.userId,
      familyId: existing.familyId,
      refreshTokenHash: hashToken(newRefreshToken),
      userAgent: meta.userAgent ?? existing.userAgent,
      ip: meta.ip ?? existing.ip,
      expiresAt,
    },
  });

  return { refreshToken: newRefreshToken, userId: existing.userId, expiresAt };
}

export async function revokeFamily(familyId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Logout: revoke only the presented session, leaving other devices signed in. */
export async function revokeByToken(rawToken: string): Promise<void> {
  await prisma.session.updateMany({
    where: { refreshTokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Logout-everywhere: revoke every session belonging to a user. */
export async function revokeAllForUser(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
