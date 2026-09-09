import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

async function ResetPasswordContent({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <p className="text-center text-sm text-stone-700">
        This reset link is missing its token.{" "}
        <Link
          href="/forgot-password"
          className="font-medium text-stone-900 hover:underline"
        >
          Request a new one
        </Link>
        .
      </p>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-center text-xl font-semibold text-stone-900">
        Choose a new password
      </h1>
      <ResetPasswordForm token={token} />
    </>
  );
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-center text-sm text-stone-500">Loading…</p>}>
      <ResetPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}
