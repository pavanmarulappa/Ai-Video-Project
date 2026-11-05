import { z } from "zod";

export const generationRequestSchema = z.object({
  prompt: z.string().trim().min(8, "Add a little more detail (at least 8 characters).").max(1000, "Keep your prompt under 1,000 characters."),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]),
  duration: z.coerce.number().int().min(1).max(30),
  resolution: z.enum(["720p", "1080p", "2K", "4K"]),
});

export type GenerationRequest = z.infer<typeof generationRequestSchema>;
