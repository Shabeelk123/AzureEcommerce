"use client";

import { useActionState } from "react";
import { resetPassword } from "@/actions/auth";

const inputClass =
  "w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-stone-700"
        >
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
        {state?.fieldErrors?.password ? (
          <ul className="mt-1 list-inside list-disc text-xs text-red-600">
            {state.fieldErrors.password.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-stone-500">
            At least 8 characters, with a letter and a number.
          </p>
        )}
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
      >
        {pending ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}
