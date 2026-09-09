"use client";

import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // access token lives 15m — refresh well before that
const HINT_COOKIE = "azh_session";

function hasSessionHint(): boolean {
  return document.cookie.split("; ").some((c) => c.startsWith(`${HINT_COOKIE}=`));
}

/**
 * Mounted once in the root layout. The access token is a short-lived
 * httpOnly JWT that Next.js can only rotate from a Server Action or Route
 * Handler — never mid-render — so keeping a signed-in visitor's session
 * alive across a long browsing session needs an explicit client-driven
 * call. This polls /api/auth/refresh periodically rather than doing the
 * rotation in `proxy.ts` on every navigation, which would turn prefetches
 * into database writes and race concurrent tabs into false reuse-detection
 * logouts (see src/lib/auth/session.ts).
 */
export function AuthRefresh() {
  useEffect(() => {
    if (!hasSessionHint()) return;

    let cancelled = false;

    async function refresh() {
      if (!hasSessionHint()) return;
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (!res.ok && !cancelled) {
          // Refresh failed (expired/reused token) — nothing to do client
          // side; the hint cookie was already cleared server-side and the
          // next protected navigation will bounce through /login.
        }
      } catch {
        // Network hiccup — try again on the next interval tick.
      }
    }

    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return null;
}
