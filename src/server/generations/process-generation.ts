import { GenerationStatus } from "@prisma/client";
import { prisma } from "../../lib/db/prisma";
import { getVideoStorage } from "../../lib/storage/storage";
import { getVideoProvider } from "../providers";

export async function processGeneration(generationId: string) {
  const generation = await prisma.generation.findUnique({ where: { id: generationId } });
  if (!generation || generation.status === GenerationStatus.COMPLETED) return;

  await prisma.generation.update({ where: { id: generationId }, data: { status: GenerationStatus.PROCESSING, errorMessage: null } });
  const provider = getVideoProvider();
  if (generation.provider !== provider.capabilities.name) {
    throw new Error(`This job was created with ${generation.provider}, but VIDEO_PROVIDER is now ${provider.capabilities.name}. Restore the previous provider or submit a new job.`);
  }
  const result = await provider.generate(
    {
      prompt: generation.prompt,
      aspectRatio: generation.aspectRatio as "16:9" | "9:16" | "1:1",
      duration: generation.duration,
      resolution: generation.resolution as "720p" | "1080p" | "2K" | "4K",
    },
    {
      existingTaskId: generation.providerTaskId,
      onTaskCreated: async (providerTaskId) => {
        await prisma.generation.update({ where: { id: generationId }, data: { providerTaskId } });
      },
    },
  );
  const outputKey = await getVideoStorage().saveFromUrl(generationId, result.videoUrl);
  await prisma.generation.update({
    where: { id: generationId },
    data: { status: GenerationStatus.COMPLETED, providerTaskId: result.taskId || generation.providerTaskId, outputKey, errorMessage: null },
  });
}
