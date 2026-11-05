import { RunwayProvider } from "./runway-provider";
import { ReplicateProvider } from "./replicate-provider";
import { FalProvider } from "./fal-provider";
import { prisma } from "@/lib/db/prisma";
import type { ProviderCapabilities, VideoProvider } from "./provider";

export const VIDEO_PROVIDER_NAMES = ["runway", "replicate", "fal"] as const;
export type VideoProviderName = (typeof VIDEO_PROVIDER_NAMES)[number];
const ACTIVE_PROVIDER_KEY = "active_video_provider";

export function isVideoProviderName(value: string): value is VideoProviderName {
  return VIDEO_PROVIDER_NAMES.includes(value as VideoProviderName);
}

export function getVideoProvider(providerName?: string): VideoProvider {
  const provider = (providerName || process.env.VIDEO_PROVIDER || "fal").toLowerCase();
  if (provider === "runway") return new RunwayProvider();
  if (provider === "replicate") return new ReplicateProvider();
  if (provider === "fal") return new FalProvider();
  throw new Error(`Unknown VIDEO_PROVIDER: ${provider}. Use runway, replicate, or fal.`);
}

export function isVideoProviderConfigured(providerName: VideoProviderName) {
  if (providerName === "runway") return Boolean(process.env.RUNWAY_API_KEY);
  if (providerName === "replicate") return Boolean(process.env.REPLICATE_API_TOKEN);
  return Boolean(process.env.FAL_KEY);
}

export async function getActiveVideoProviderName(): Promise<VideoProviderName> {
  const setting = await prisma.appSetting.findUnique({ where: { key: ACTIVE_PROVIDER_KEY }, select: { value: true } });
  const configuredDefault = (process.env.VIDEO_PROVIDER || "fal").toLowerCase();
  const fallback = isVideoProviderName(configuredDefault) ? configuredDefault : "fal";
  const selected = setting?.value || fallback;
  return isVideoProviderName(selected) ? selected : fallback;
}

export async function setActiveVideoProviderName(providerName: VideoProviderName) {
  await prisma.appSetting.upsert({
    where: { key: ACTIVE_PROVIDER_KEY },
    create: { key: ACTIVE_PROVIDER_KEY, value: providerName },
    update: { value: providerName },
  });
}

export function getVideoProviderOptions(): Array<{
  name: VideoProviderName;
  label: string;
  configured: boolean;
  capabilities: ProviderCapabilities;
}> {
  return VIDEO_PROVIDER_NAMES.map((name) => {
    const provider = getVideoProvider(name);
    return { name, label: provider.capabilities.label, configured: isVideoProviderConfigured(name), capabilities: provider.capabilities };
  });
}
