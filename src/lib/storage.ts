import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
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
