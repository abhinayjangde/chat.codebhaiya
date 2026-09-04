import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../config/env.js";

export interface DocumentProcessingJob {
  documentId: string;
  userId: string;
  s3Key: string;
  mimeType: string;
  filename: string;
}

const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const documentQueue = new Queue<DocumentProcessingJob>(
  env.DOCUMENT_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5_000,
      },
      removeOnComplete: 100,
      removeOnFail: 1_000,
    },
  }
);

export async function enqueueDocumentProcessing(
  job: DocumentProcessingJob
): Promise<void> {
  await documentQueue.add("process-document", job, {
    jobId: job.documentId,
  });
}
