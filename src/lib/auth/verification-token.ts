import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { VerificationPurpose } from "@/generated/prisma/enums";

const TTL_MS: Record<VerificationPurpose, number> = {
  VERIFY_EMAIL: 24 * 60 * 60 * 1000, // 24h
  RESET_PASSWORD: 60 * 60 * 1000, // 1h
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a single-use token for the given purpose. Returns the raw token to email — only its hash is stored. */
export async function createVerificationToken(
  userId: string,
  purpose: VerificationPurpose,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.verificationToken.create({
    data: {
      userId,
      purpose,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TTL_MS[purpose]),
    },
  });
  return token;
}

export type ConsumeTokenResult =
  { ok: true; userId: string } | { ok: false; reason: "invalid" | "expired" | "used" };

/**
 * Validates and marks a token used, atomically — a second attempt to
 * consume the same token (double form submit, replay) fails rather than
 * verifying twice or resetting the password twice.
 */
export async function consumeVerificationToken(
  rawToken: string,
  purpose: VerificationPurpose,
): Promise<ConsumeTokenResult> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });

  if (!record || record.purpose !== purpose) return { ok: false, reason: "invalid" };
  if (record.usedAt) return { ok: false, reason: "used" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "expired" };

  const claim = await prisma.verificationToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claim.count === 0) return { ok: false, reason: "used" }; // lost a concurrent race

  return { ok: true, userId: record.userId };
}
