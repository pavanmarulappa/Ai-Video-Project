export type AspectRatio = "16:9" | "9:16" | "1:1";
export type Resolution = "720p" | "1080p" | "2K" | "4K";

export type ProviderCapabilities = {
  name: string;
  label: string;
  aspectRatios: AspectRatio[];
  durations: number[];
  resolutions: Resolution[];
  note?: string;
};

export type ProviderRequest = {
  prompt: string;
  aspectRatio: AspectRatio;
  duration: number;
  resolution: Resolution;
};

export type ProviderTaskOptions = {
  existingTaskId?: string | null;
  onTaskCreated: (taskId: string) => Promise<void>;
};

export type ProviderOutput = { videoUrl: string; taskId?: string };

export interface VideoProvider {
  capabilities: ProviderCapabilities;
  generate(request: ProviderRequest, options: ProviderTaskOptions): Promise<ProviderOutput>;
}
