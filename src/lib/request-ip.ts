import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP from proxy headers — used for rate-limit keys, not for security decisions. */
export async function requestIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown"
  );
}
