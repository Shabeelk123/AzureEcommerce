import type { ReactNode } from "react";
import Link from "next/link";
import { logout } from "@/actions/auth";

// No session read at this level on purpose: with Cache Components enabled,
// a top-level `await` on the session in a layout would hold `{children}`
// behind that request for every nested route. `proxy.ts` already gates
// unauthenticated visitors before they reach here; each page reads the
// user itself, behind its own <Suspense> boundary.
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:flex-row">
      <aside className="shrink-0 sm:w-48">
        <Link
          href="/"
          className="mb-6 block text-lg font-semibold tracking-tight text-stone-900"
        >
          AzureHijabs
        </Link>
        <nav className="flex flex-row gap-4 text-sm sm:flex-col">
          <Link href="/account" className="text-stone-700 hover:text-stone-900">
            Profile
          </Link>
          <Link href="/account/addresses" className="text-stone-700 hover:text-stone-900">
            Addresses
          </Link>
          <Link href="/account/orders" className="text-stone-700 hover:text-stone-900">
            Orders
          </Link>
        </nav>
        <form action={logout} className="mt-6 hidden sm:block">
          <button
            type="submit"
            className="text-sm text-stone-500 hover:text-stone-900 hover:underline"
          >
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
