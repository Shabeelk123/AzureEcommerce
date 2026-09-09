import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  SessionReuseError,
  createSessionFamily,
  revokeByToken,
  revokeFamily,
  rotateRefreshToken,
} from "@/lib/auth/session";

// These hit the real (local/CI) Postgres instance rather than mocking
// Prisma — the property under test (rotation + reuse detection) is exactly
// the kind of thing that looks right with a fake in-memory model and wrong
// against real conditional updates.
let userId: string;

beforeEach(async () => {
  const user = await prisma.user.create({
    data: { email: `session-test-${crypto.randomUUID()}@example.com` },
  });
  userId = user.id;
});

afterEach(async () => {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
});

describe("session rotation", () => {
  it("creates a session family and allows one rotation", async () => {
    const first = await createSessionFamily(userId);
    const rotated = await rotateRefreshToken(first.refreshToken);

    expect(rotated).not.toBeNull();
    expect(rotated?.userId).toBe(userId);
    expect(rotated?.refreshToken).not.toBe(first.refreshToken);
  });

  it("chains multiple rotations within the same family", async () => {
    const first = await createSessionFamily(userId);
    const second = await rotateRefreshToken(first.refreshToken);
    const third = await rotateRefreshToken(second!.refreshToken);

    expect(third).not.toBeNull();

    const sessions = await prisma.session.findMany({ where: { userId } });
    expect(sessions).toHaveLength(3);
    expect(new Set(sessions.map((s) => s.familyId)).size).toBe(1);
  });

  it("treats reuse of an already-rotated token as theft and revokes the whole family", async () => {
    const first = await createSessionFamily(userId);
    await rotateRefreshToken(first.refreshToken); // rotates once, as a legitimate client would

    // An attacker (or a bug) presents the same, now-stale token again.
    await expect(rotateRefreshToken(first.refreshToken)).rejects.toThrow(
      SessionReuseError,
    );

    const sessions = await prisma.session.findMany({ where: { userId } });
    expect(sessions.every((s) => s.revokedAt !== null)).toBe(true);
  });

  it("returns null for a token that was never issued", async () => {
    const result = await rotateRefreshToken("not-a-real-token");
    expect(result).toBeNull();
  });

  it("logout revokes only the presented session's family, not other devices' sessions", async () => {
    // Two independent logins (e.g. phone + laptop) are two separate
    // families for the same user.
    const deviceA = await createSessionFamily(userId);
    const deviceB = await createSessionFamily(userId);

    await revokeByToken(deviceA.refreshToken);

    // Device A's token is now revoked...
    await expect(rotateRefreshToken(deviceA.refreshToken)).rejects.toThrow(
      SessionReuseError,
    );
    // ...but device B is untouched and can still rotate normally.
    await expect(rotateRefreshToken(deviceB.refreshToken)).resolves.not.toBeNull();
  });

  it("revokeFamily revokes every session sharing a familyId", async () => {
    const first = await createSessionFamily(userId);
    await rotateRefreshToken(first.refreshToken);

    await revokeFamily(first.familyId);

    const sessions = await prisma.session.findMany({ where: { userId } });
    expect(sessions.every((s) => s.revokedAt !== null)).toBe(true);
  });
});
