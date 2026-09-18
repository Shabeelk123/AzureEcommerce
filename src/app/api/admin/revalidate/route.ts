import { revalidateTag } from "next/cache";
import { z } from "zod";
import { env } from "@/env";

/**
 * Lets a trusted out-of-band writer (scripts/import-products.ts, which
 * writes straight to Postgres and R2, bypassing the app entirely) tell the
 * running server its Cache-Components caches for one or more tags are
 * stale — without this, a direct-DB write is invisible until the cache's
 * multi-day lifetime naturally expires or the service restarts (see the
 * "New Arrivals still shows old data" incident this was built to prevent).
 *
 * `updateTag` is unavailable here (Server Actions only), so this uses
 * `revalidateTag(tag, { expire: 0 })` — the documented pattern for
 * webhook/route-handler callers that need the tag gone immediately rather
 * than served stale-while-revalidating.
 */
const bodySchema = z.object({ tags: z.array(z.string().min(1)).min(1) });

export async function POST(request: Request) {
  if (!env.REVALIDATE_SECRET) {
    return Response.json({ error: "REVALIDATE_SECRET is not configured." }, { status: 501 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.REVALIDATE_SECRET}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Body must be { tags: string[] }." }, { status: 400 });
  }

  for (const tag of parsed.data.tags) {
    revalidateTag(tag, { expire: 0 });
  }

  return Response.json({ revalidated: parsed.data.tags });
}
