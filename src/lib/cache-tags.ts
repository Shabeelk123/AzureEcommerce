import "server-only";
import { revalidateTag, updateTag } from "next/cache";

/**
 * `updateTag` gives read-your-own-writes semantics but throws synchronously
 * outside an active Server Action request scope — the same failure mode
 * `after()` has (see runAfterResponse in src/lib/order.ts). Every admin
 * mutation here is normally called from inside a "use server" action, but
 * these lib functions are also exercised directly from integration tests
 * and one-off scripts with no request scope at all. Falling back to
 * revalidateTag (and, failing that, doing nothing) means a missing request
 * scope can never mask an already-successful database write.
 */
export function invalidateTag(tag: string): void {
  try {
    updateTag(tag);
  } catch {
    try {
      revalidateTag(tag, "minutes");
    } catch {
      // No request scope at all (e.g. a bare script) — nothing to invalidate.
    }
  }
}
