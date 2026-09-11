"use client";

import { useEffect } from "react";

// Only fires if the ROOT layout itself throws (a failure src/app/error.tsx
// can't catch, since that boundary lives *inside* the root layout). Must
// render its own <html>/<body> — there is no layout left above this to
// provide them. Kept deliberately plain (no Tailwind theme dependency,
// no shared components) since whatever broke may have been in that
// shared chrome.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Something went wrong</p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>AzureHijabs hit an unexpected error</h1>
        <p style={{ maxWidth: "24rem", fontSize: "0.875rem", color: "#6b7280" }}>
          Please refresh the page. If this keeps happening, contact support.
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "9999px",
            background: "#090707",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
