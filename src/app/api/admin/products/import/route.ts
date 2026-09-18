import { env } from "@/env";
import { BulkImportError, importProduct, productImportSchema } from "@/lib/admin/bulk-import";

/**
 * Bulk product-creation endpoint for external automation (built for an
 * n8n workflow: one product per HTTP Request node call, looping over
 * rows from a sheet/database/AI-generation step). Not a customer- or
 * admin-session-facing route — authenticated by a static bearer token
 * (PRODUCT_IMPORT_API_KEY) instead of the cookie session, since the
 * caller is a script/workflow, not a logged-in browser.
 *
 * See src/lib/admin/bulk-import.ts for the request shape and behavior
 * (idempotent by slug, images fetched from public URLs and re-uploaded
 * to R2, cache invalidated on success).
 */
export async function POST(request: Request) {
  if (!env.PRODUCT_IMPORT_API_KEY) {
    return Response.json(
      { error: "PRODUCT_IMPORT_API_KEY is not configured on the server." },
      { status: 501 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.PRODUCT_IMPORT_API_KEY}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = productImportSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid request body.",
        issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      },
      { status: 400 },
    );
  }

  try {
    const result = await importProduct(parsed.data);
    return Response.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof BulkImportError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    console.error("[bulk-import] unexpected failure", error);
    return Response.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
