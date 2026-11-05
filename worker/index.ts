import { GenerationStatus } from "@prisma/client";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { GENERATION_QUEUE, type GenerationQueueJob } from "../src/lib/queue/generation-queue";
import { prisma } from "../src/lib/db/prisma";
import { processGeneration } from "../src/server/generations/process-generation";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });
const worker = new Worker<GenerationQueueJob>(
  GENERATION_QUEUE,
  async (job) => processGeneration(job.data.generationId),
  { connection, concurrency: Number(process.env.WORKER_CONCURRENCY || 2), lockDuration: 20 * 60 * 1000 },
);

worker.on("ready", () => console.info("Video generation worker is ready."));
worker.on("completed", (job) => console.info(`Generation ${job.data.generationId} completed.`));
worker.on("failed", (job, error) => {
  console.error(`Generation ${job?.data.generationId || "unknown"} attempt failed:`, error.message);
  if (job && job.attemptsMade >= Number(job.opts.attempts || 1)) {
    void prisma.generation.updateMany({
      where: { id: job.data.generationId, status: { not: GenerationStatus.COMPLETED } },
      data: {
        status: GenerationStatus.FAILED,
        errorMessage: (error.message || "Generation failed. Please try again.").slice(0, 500),
      },
    }).catch((dbError) => console.error("Could not mark generation as failed", dbError));
  }
});
worker.on("error", (error) => console.error("Generation worker error", error));

async function shutdown() {
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
