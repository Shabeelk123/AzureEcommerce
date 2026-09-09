"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/actions/auth";

const inputClass =
  "w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);

  if (state?.error && !state.fieldErrors) {
    // The action always returns the same generic message in `error` on
    // success, by design — see requestPasswordReset in src/actions/auth.ts.
    return <p className="text-center text-sm text-stone-700">{state.error}</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-stone-500">
        Enter the email associated with your account and we&apos;ll send a link to reset
        your password.
      </p>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
        />
        {state?.fieldErrors?.email && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-stone-500">
        <Link href="/login" className="font-medium text-stone-900 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
