import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-stone-50 px-4 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 block text-center text-lg font-semibold tracking-tight text-stone-900"
        >
          AzureHijabs
        </Link>
        <div className="rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
