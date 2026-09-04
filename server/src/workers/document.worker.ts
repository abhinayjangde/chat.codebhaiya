import { Worker, type Job } from "bullmq";
import mongoose from "mongoose";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import type { DocumentProcessingJob } from "../queues/document.queue.js";
import { processDocument } from "../services/document-processing.service.js";

export interface DocumentWorkerHandle {
  close: () => Promise<void>;
}

export async function startDocumentWorker(options: {
  connectDatabase?: boolean;
} = {}): Promise<DocumentWorkerHandle> {
  if (options.connectDatabase ?? false) {
    await mongoose.connect(env.MONGODB_URL, {
      serverSelectionTimeoutMS: 5_000,
    });
  }

  const redisConnection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<DocumentProcessingJob>(
    env.DOCUMENT_QUEUE_NAME,
    async (job: Job<DocumentProcessingJob>) => {
      console.log(
        `Processing document ${job.data.documentId} (attempt ${job.attemptsMade + 1})`
      );

      await processDocument(job.data.documentId);

      console.log(`Document ${job.data.documentId} processed successfully`);
    },
    {
      connection: redisConnection,
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Document job completed: ${job.id}`);
  });

  worker.on("failed", (job, error) => {
    console.error(
      `Document job failed: ${job?.id ?? "unknown"} (attempt ${job?.attemptsMade ?? 0}):`,
      error
    );
  });

  worker.on("error", (error) => {
    console.error("Document worker error:", error);
  });

  console.log(`Document worker listening on queue ${env.DOCUMENT_QUEUE_NAME}`);

  return {
    async close(): Promise<void> {
      await worker.close();
      await redisConnection.quit();
    },
  };
}

async function startStandaloneWorker(): Promise<void> {
  const worker = await startDocumentWorker({ connectDatabase: true });
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.log(`Shutting down document worker after ${signal}`);

    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

if (process.argv[1]?.endsWith("document.worker.js")) {
  void startStandaloneWorker().catch((error) => {
    console.error("Failed to start document worker:", error);
    process.exit(1);
  });
}
