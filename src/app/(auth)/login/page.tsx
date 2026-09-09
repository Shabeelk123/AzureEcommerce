import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

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

// An inert skeleton, deliberately NOT a second `<LoginForm />`. A fallback
// that renders the same interactive component as the real content creates
// a real component instance with its own `useActionState` — if a
// submission lands on that fallback instance before `LoginContent`
// resolves and swaps it out (this boundary's own work is a microtask, so
// the window is tiny but not zero — any added latency widens it), the
// returned error state is attached to an instance that's about to be
// discarded, and silently vanishes when the real form mounts fresh.
function LoginFormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
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
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
