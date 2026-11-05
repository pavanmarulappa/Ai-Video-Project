import { Queue } from "bullmq";
import IORedis from "ioredis";

export const GENERATION_QUEUE = "video-generation";
export type GenerationQueueJob = { generationId: string };

const globalForQueue = globalThis as typeof globalThis & {
  generationQueue?: Queue<GenerationQueueJob>;
  generationRedis?: IORedis;
};

function connection() {
  globalForQueue.generationRedis ??= new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    connectTimeout: 5000,
    enableOfflineQueue: false,
    retryStrategy: (attempt) => attempt > 5 ? null : Math.min(attempt * 250, 1500),
  });
  return globalForQueue.generationRedis;
}

export function getGenerationQueue() {
  globalForQueue.generationQueue ??= new Queue<GenerationQueueJob>(GENERATION_QUEUE, {
    connection: connection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    },
  });
  return globalForQueue.generationQueue;
}
