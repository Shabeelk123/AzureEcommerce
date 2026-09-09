import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

export const metadata: Metadata = { title: "Verify email" };

const COPY: Record<string, { heading: string; body: string }> = {
  success: {
    heading: "Email verified",
    body: "Thanks — your email address is confirmed.",
  },
  expired: {
    heading: "Link expired",
    body: "That verification link has expired. Sign in and request a new one from your account settings.",
  },
  used: {
    heading: "Link already used",
    body: "That verification link has already been used.",
  },
  invalid: {
    heading: "Invalid link",
    body: "That verification link isn't valid. Sign in and request a new one from your account settings.",
  },
};

async function VerifyEmailContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const copy = COPY[status ?? ""] ?? COPY.invalid;

  return (
    <>
      <h1 className="mb-2 text-xl font-semibold text-stone-900">{copy.heading}</h1>
      <p className="mb-6 text-sm text-stone-500">{copy.body}</p>
    </>
  );
}

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-stone-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-8 text-center shadow-sm">
        <Suspense
          fallback={<p className="text-sm text-stone-500">Checking your link…</p>}
        >
          <VerifyEmailContent searchParams={searchParams} />
        </Suspense>
        <Link
          href="/account"
          className="inline-block rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          Go to your account
        </Link>
      </div>
    </div>
  );
}
