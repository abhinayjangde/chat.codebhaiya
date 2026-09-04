import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

const s3Client = new S3Client({
  region: env.AWS_REGION,
  ...(env.AWS_S3_ENDPOINT ? { endpoint: env.AWS_S3_ENDPOINT, forcePathStyle: true } : {}),
});

function getBucket(): string {
  if (!env.AWS_S3_BUCKET) {
    throw new Error("AWS_S3_BUCKET is not configured");
  }

  return env.AWS_S3_BUCKET;
}

export async function uploadDocumentToS3(input: {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      Metadata: input.metadata,
    })
  );
}

export async function deleteDocumentFromS3(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    })
  );
}
