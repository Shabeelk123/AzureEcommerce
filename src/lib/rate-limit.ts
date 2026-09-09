import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/env";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
  // Bound every call — an unreachable/misconfigured Redis must fail fast
  // into checkRateLimit's fail-open catch, not hang a login/checkout
  // request for however long DNS/TCP takes to give up on its own.
  signal: () => AbortSignal.timeout(2000),
});

// Auth endpoints are the highest-value brute-force target in the app, so
// each gets its own bucket/key-prefix rather than sharing one limiter.
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 m"),
  prefix: "ratelimit:login",
});

export const signupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  prefix: "ratelimit:signup",
});

export const passwordResetLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  prefix: "ratelimit:password-reset",
});

/**
 * Rate limiting is important but must never be a single point of failure
 * for checkout or login: if Upstash is unreachable or (in local dev)
 * unconfigured, fail OPEN — log it and let the request through — rather
 * than taking auth down because a third-party Redis call timed out.
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string,
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  try {
    const result = await limiter.limit(identifier);
    if (result.success) return { allowed: true };
    const retryAfterSeconds = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));
    return { allowed: false, retryAfterSeconds };
  } catch (error) {
    console.error("[rate-limit] Upstash call failed, failing open", error);
    return { allowed: true };
  }
}
