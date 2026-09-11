"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Catches an unhandled error anywhere below the root layout that isn't
// already handled by a more specific error.tsx (e.g. src/app/admin/error.tsx).
// Doesn't have access to whatever nested layout/header was rendering above
// the failing segment — that's inherent to how error boundaries reset in
// the App Router, not something to work around here.
export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
        Something went wrong
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        We hit a snag loading this page
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Please try again. If this keeps happening, contact support and mention what you were
        doing when it happened.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
