import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import { imageSize } from "image-size";
import { env } from "@/env";

// Cloudflare R2 speaks the S3 API — no R2-specific SDK needed, just point
// the S3 client at R2's account-scoped endpoint. Uploads go straight from
// the admin's browser to R2 via a short-lived presigned PUT URL; the server
// only signs the URL and later records the resulting public URL against a
// ProductImage row. The file bytes themselves never pass through our server.
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  // @aws-sdk/client-s3 v3.729+ defaults to WHEN_SUPPORTED, which signs a
  // CRC32 checksum requirement into every presigned URL (as
  // x-amz-checksum-crc32 / x-amz-sdk-checksum-algorithm query params).
  // The browser's plain `fetch(uploadUrl, { method: "PUT" })` never sends
  // a matching checksum, R2 rejects the mismatch, and because that
  // rejection response often lacks CORS headers the browser surfaces it
  // as an opaque "Failed to fetch" instead of a readable error.
  requestChecksumCalculation: "WHEN_REQUIRED",
});

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export class StorageError extends Error {}

export async function createPresignedUploadUrl(params: {
  contentType: string;
  folder: "products" | "categories" | "collections";
}): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  if (!ALLOWED_CONTENT_TYPES.has(params.contentType)) {
    throw new StorageError(`Unsupported content type: ${params.contentType}`);
  }

  const extension = params.contentType.split("/")[1];
  const key = `${params.folder}/${nanoid()}.${extension}`;

  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      ContentType: params.contentType,
    }),
    { expiresIn: 300 },
  );

  return {
    uploadUrl,
    publicUrl: `${env.R2_PUBLIC_URL}/${key}`,
    key,
  };
}

const MAX_FETCHED_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB

/**
 * Server-side counterpart to the presigned-URL flow above: fetches an
 * image from an external URL (e.g. one an n8n workflow hands us) and
 * uploads it to R2 directly, rather than handing a browser a signed PUT
 * URL. Used by the bulk product-import API — see
 * src/lib/admin/bulk-import.ts.
 */
export async function uploadImageFromUrl(
  sourceUrl: string,
  folder: "products" | "categories" | "collections",
): Promise<{ url: string; width: number; height: number }> {
  let response: Response;
  try {
    response = await fetch(sourceUrl, { signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    throw new StorageError(`Couldn't fetch image URL: ${(error as Error).message}`);
  }
  if (!response.ok) {
    throw new StorageError(`Image URL returned ${response.status}: ${sourceUrl}`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0].trim();
  if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new StorageError(`Unsupported or missing content type "${contentType}" for ${sourceUrl}`);
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (contentLength && contentLength > MAX_FETCHED_IMAGE_BYTES) {
    throw new StorageError(`Image exceeds the 15MB limit: ${sourceUrl}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_FETCHED_IMAGE_BYTES) {
    throw new StorageError(`Image exceeds the 15MB limit: ${sourceUrl}`);
  }

  const extension = contentType.split("/")[1];
  const key = `${folder}/${nanoid()}.${extension}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  const { width, height } = imageSize(buffer);
  return { url: `${env.R2_PUBLIC_URL}/${key}`, width, height };
}
