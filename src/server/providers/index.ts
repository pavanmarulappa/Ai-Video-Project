import { mockProvider } from "./mock-provider";
import { RunwayProvider } from "./runway-provider";
import type { VideoProvider } from "./provider";

export function getVideoProvider(): VideoProvider {
  const provider = (process.env.VIDEO_PROVIDER || "mock").toLowerCase();
  if (provider === "mock") return mockProvider;
  if (provider === "runway") return new RunwayProvider();
  throw new Error(`Unknown VIDEO_PROVIDER: ${provider}. Use mock or runway.`);
}
