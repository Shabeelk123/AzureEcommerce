import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "@/lib/auth/jwt";

describe("access token", () => {
  it("round-trips a signed token", async () => {
    const token = await signAccessToken({
      userId: "user_123",
      email: "shopper@example.com",
      role: "CUSTOMER",
    });
    const payload = await verifyAccessToken(token);

    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("user_123");
    expect(payload?.email).toBe("shopper@example.com");
    expect(payload?.role).toBe("CUSTOMER");
  });

  it("rejects a tampered token", async () => {
    const token = await signAccessToken({
      userId: "user_123",
      email: "shopper@example.com",
      role: "CUSTOMER",
    });
    const [header, payload, signature] = token.split(".");
    const tampered = `${header}.${payload}x.${signature}`;

    expect(await verifyAccessToken(tampered)).toBeNull();
  });

  it("rejects a token signed with the wrong algorithm's shape (garbage input)", async () => {
    expect(await verifyAccessToken("not.a.jwt")).toBeNull();
  });

  it("returns null for an undefined token", async () => {
    expect(await verifyAccessToken(undefined)).toBeNull();
  });

  it("carries the ADMIN role through unchanged", async () => {
    const token = await signAccessToken({
      userId: "admin_1",
      email: "admin@azurehijabs.com",
      role: "ADMIN",
    });
    const payload = await verifyAccessToken(token);
    expect(payload?.role).toBe("ADMIN");
  });
});
