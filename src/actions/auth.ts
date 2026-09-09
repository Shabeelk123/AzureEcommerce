"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signAccessToken } from "@/lib/auth/jwt";
import { createSessionFamily, revokeAllForUser, revokeByToken } from "@/lib/auth/session";
import {
  clearAuthCookies,
  getRefreshTokenCookie,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "@/lib/auth/cookies";
import {
  createVerificationToken,
  consumeVerificationToken,
} from "@/lib/auth/verification-token";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import {
  checkRateLimit,
  loginLimiter,
  passwordResetLimiter,
  signupLimiter,
} from "@/lib/rate-limit";
import {
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validators/auth";
import { env } from "@/env";

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

async function requestIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown"
  );
}

async function establishSession(
  userId: string,
  email: string,
  role: "CUSTOMER" | "ADMIN",
) {
  const accessToken = await signAccessToken({ userId, email, role });
  const { refreshToken, expiresAt } = await createSessionFamily(userId, {
    userAgent: (await headers()).get("user-agent"),
    ip: await requestIp(),
  });
  await setAccessTokenCookie(accessToken);
  await setRefreshTokenCookie(refreshToken, expiresAt);
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const ip = await requestIp();
  const { allowed } = await checkRateLimit(signupLimiter, ip);
  if (!allowed) {
    return { error: "Too many signup attempts. Please try again later." };
  }

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    return {
      error: "An account with this email already exists. Try logging in instead.",
    };
  }

  const passwordHash = await hashPassword(password);
  const user = existing
    ? // A guest checkout already created this email as a userless order
      // contact — claim it as a real account rather than erroring.
      await prisma.user.update({
        where: { id: existing.id },
        data: { name, passwordHash },
      })
    : await prisma.user.create({ data: { name, email, passwordHash } });

  const verifyToken = await createVerificationToken(user.id, "VERIFY_EMAIL");
  // `after()` runs once the response has already been sent (and still
  // runs even though this action ends in `redirect()`, per Next's docs) —
  // true fire-and-forget without either blocking signup on Resend's
  // latency or orphaning the promise the way a bare unawaited call would
  // risk on a platform that freezes the process between requests. We're
  // on a long-lived container, not serverless, but this is the portable,
  // documented pattern either way.
  after(async () => {
    try {
      await sendVerificationEmail(
        email,
        `${env.APP_URL}/api/auth/verify-email?token=${verifyToken}`,
      );
    } catch (err) {
      console.error("[auth] failed to send verification email", err);
    }
  });

  await establishSession(user.id, user.email, user.role);
  redirect("/account");
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const ip = await requestIp();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { email, password } = parsed.data;

  const { allowed } = await checkRateLimit(loginLimiter, `${ip}:${email}`);
  if (!allowed) {
    return { error: "Too many login attempts. Please try again in a few minutes." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const genericError = "Invalid email or password.";

  if (!user || !user.passwordHash) {
    return { error: genericError };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return {
      error: "Too many failed attempts. Please try again later or reset your password.",
    };
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const failedLoginCount = user.failedLoginCount + 1;
    const lockedUntil =
      failedLoginCount >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_MS) : null;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: lockedUntil ? 0 : failedLoginCount, lockedUntil },
    });
    return { error: genericError };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  await establishSession(user.id, user.email, user.role);

  const next = formData.get("next");
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : null;
  redirect(safeNext ?? (user.role === "ADMIN" ? "/admin" : "/account"));
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshTokenCookie();
  if (refreshToken) {
    await revokeByToken(refreshToken);
  }
  await clearAuthCookies();
  redirect("/login");
}

export async function requestPasswordReset(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const ip = await requestIp();
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { email } = parsed.data;

  const { allowed } = await checkRateLimit(passwordResetLimiter, `${ip}:${email}`);
  // Same response whether or not the account exists, and even when rate
  // limited — an attacker must not be able to distinguish "no such
  // account" from "too many requests" from "email sent".
  const genericState: AuthFormState = {
    error: "If an account exists for that email, we've sent a password reset link.",
  };
  if (!allowed) return genericState;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.passwordHash) {
    const token = await createVerificationToken(user.id, "RESET_PASSWORD");
    // Deferred via after() for the same reason as the signup email — and
    // here it also closes a timing side-channel: without it, the
    // "account exists" branch takes visibly longer than the "no such
    // account" branch (which skips straight to returning genericState),
    // which is exactly the kind of signal the identical response text is
    // trying to deny an attacker.
    after(async () => {
      try {
        await sendPasswordResetEmail(
          email,
          `${env.APP_URL}/reset-password?token=${token}`,
        );
      } catch (err) {
        console.error("[auth] failed to send password reset email", err);
      }
    });
  }
  return genericState;
}

export async function resetPassword(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { token, password } = parsed.data;

  const result = await consumeVerificationToken(token, "RESET_PASSWORD");
  if (!result.ok) {
    return {
      error:
        result.reason === "expired"
          ? "This reset link has expired. Request a new one."
          : "This reset link is invalid or has already been used.",
    };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: result.userId },
    data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
  });
  // Changing the password invalidates every existing session — including
  // whatever session an attacker who triggered this reset might hold.
  await revokeAllForUser(result.userId);

  redirect("/login?reset=success");
}
