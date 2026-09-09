import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const { next, reset } = await searchParams;

  return (
    <>
      {reset === "success" && (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Your password has been reset. Sign in with your new password.
        </p>
      )}
      <LoginForm next={next} />
    </>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  return (
    <>
      <h1 className="mb-6 text-center text-xl font-semibold text-stone-900">Sign in</h1>
      <Suspense fallback={<LoginForm />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
