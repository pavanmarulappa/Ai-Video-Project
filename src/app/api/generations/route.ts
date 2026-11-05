import { GenerationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getGenerationQueue } from "@/lib/queue/generation-queue";
import { generationRequestSchema } from "@/lib/validation/generation";
import { getVideoProvider } from "@/server/providers";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to view your videos." }, { status: 401 });

  const generations = await prisma.generation.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      prompt: true,
      aspectRatio: true,
      duration: true,
      resolution: true,
      status: true,
      provider: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ generations });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to create a video." }, { status: 401 });

  const parsed = generationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check your video settings." }, { status: 400 });
  }

  let provider;
  try {
    provider = getVideoProvider();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The video provider is not configured." }, { status: 503 });
  }
  if (provider.capabilities.name === "runway" && !process.env.RUNWAY_API_KEY) {
    return NextResponse.json({ error: "Runway is selected, but RUNWAY_API_KEY is missing from .env." }, { status: 503 });
  }

  const requestData = parsed.data;
  const unsupported: string[] = [];
  if (!provider.capabilities.aspectRatios.includes(requestData.aspectRatio)) unsupported.push(`${requestData.aspectRatio} aspect ratio`);
  if (!provider.capabilities.durations.includes(requestData.duration)) unsupported.push(`${requestData.duration}-second duration`);
  if (!provider.capabilities.resolutions.includes(requestData.resolution)) unsupported.push(`${requestData.resolution} quality`);
  if (unsupported.length) {
    return NextResponse.json({ error: `${provider.capabilities.label} does not support ${unsupported.join(", ")}. Choose from the options shown for this provider.` }, { status: 422 });
  }

  const generation = await prisma.generation.create({
    data: {
      userId: session.id,
      prompt: requestData.prompt,
      aspectRatio: requestData.aspectRatio,
      duration: requestData.duration,
      resolution: requestData.resolution,
      provider: provider.capabilities.name,
      status: GenerationStatus.QUEUED,
    },
    select: { id: true, status: true },
  });

  try {
    await getGenerationQueue().add("generate-video", { generationId: generation.id }, { jobId: generation.id });
  } catch (error) {
    console.error("Could not enqueue video generation", error);
    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: GenerationStatus.FAILED, errorMessage: "The job queue is unavailable. Start Redis and try again." },
    });
    return NextResponse.json({ error: "The job queue is unavailable. Start Redis and try again." }, { status: 503 });
  }

  return NextResponse.json({ generation }, { status: 201 });
}
