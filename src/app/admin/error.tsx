"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-lg border border-stone-200 bg-white p-8 text-center">
      <p className="text-xs font-medium tracking-widest text-stone-500 uppercase">
        Something went wrong
      </p>
      <h1 className="text-lg font-semibold text-stone-900">This admin page failed to load</h1>
      <p className="max-w-sm text-sm text-stone-500">
        Try again — if it keeps happening, check the server logs for the underlying error.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
