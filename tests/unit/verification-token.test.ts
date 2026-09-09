import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  consumeVerificationToken,
  createVerificationToken,
} from "@/lib/auth/verification-token";

let userId: string;

beforeEach(async () => {
  const user = await prisma.user.create({
    data: { email: `verify-test-${crypto.randomUUID()}@example.com` },
  });
  userId = user.id;
});

afterEach(async () => {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
});

describe("verification tokens", () => {
  it("consumes a freshly issued token exactly once", async () => {
    const token = await createVerificationToken(userId, "VERIFY_EMAIL");

    const first = await consumeVerificationToken(token, "VERIFY_EMAIL");
    expect(first).toEqual({ ok: true, userId });

    const second = await consumeVerificationToken(token, "VERIFY_EMAIL");
    expect(second).toEqual({ ok: false, reason: "used" });
  });

  it("rejects a token consumed for the wrong purpose", async () => {
    const token = await createVerificationToken(userId, "VERIFY_EMAIL");
    const result = await consumeVerificationToken(token, "RESET_PASSWORD");
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects an unknown token", async () => {
    const result = await consumeVerificationToken("not-a-real-token", "VERIFY_EMAIL");
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects an expired token", async () => {
    const token = await createVerificationToken(userId, "RESET_PASSWORD");
    await prisma.verificationToken.updateMany({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await consumeVerificationToken(token, "RESET_PASSWORD");
    expect(result).toEqual({ ok: false, reason: "expired" });
  });
});
