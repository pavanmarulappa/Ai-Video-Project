import type { ProviderCapabilities, ProviderRequest, ProviderTaskOptions, VideoProvider } from "./provider";

type RunwayTask = {
  id?: string;
  status?: string;
  output?: string[];
  failure?: string;
  error?: string;
};

const API_BASE = "https://api.dev.runwayml.com/v1";
const API_VERSION = "2024-11-06";

export class RunwayProvider implements VideoProvider {
  capabilities: ProviderCapabilities = {
    name: "runway",
    label: "Runway Gen-4.5",
    aspectRatios: ["16:9", "9:16"],
    durations: [5, 8, 10],
    resolutions: ["720p"],
    note: "Gen-4.5 text-to-video supports landscape or portrait at 720p. Square and higher resolutions are not available through this adapter.",
  };

  private get apiKey() {
    if (!process.env.RUNWAY_API_KEY) throw new Error("Set RUNWAY_API_KEY in .env to use Runway.");
    return process.env.RUNWAY_API_KEY;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "X-Runway-Version": API_VERSION,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Runway request failed (${response.status}). ${detail.slice(0, 220)}`);
    }
    return response.json() as Promise<T>;
  }

  async generate(request: ProviderRequest, options: ProviderTaskOptions) {
    let taskId = options.existingTaskId ?? undefined;
    if (!taskId) {
      const ratio = request.aspectRatio === "16:9" ? "1280:720" : "720:1280";
      const task = await this.request<RunwayTask>("/text_to_video", {
        method: "POST",
        body: JSON.stringify({
          model: "gen4.5",
          promptText: request.prompt,
          ratio,
          duration: request.duration,
        }),
      });
      if (!task.id) throw new Error("Runway accepted the request but did not return a task ID.");
      taskId = task.id;
      await options.onTaskCreated(taskId);
    }

    const deadline = Date.now() + 15 * 60 * 1000;
    while (Date.now() < deadline) {
      const task = await this.request<RunwayTask>(`/tasks/${encodeURIComponent(taskId)}`);
      if (task.status === "SUCCEEDED") {
        const videoUrl = task.output?.[0];
        if (!videoUrl) throw new Error("Runway completed the task without returning a video URL.");
        return { taskId, videoUrl };
      }
      if (task.status === "FAILED" || task.status === "CANCELED") {
        throw new Error(`Runway generation ${task.status.toLowerCase()}. ${task.failure || task.error || "Please try again."}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    throw new Error("Runway generation is taking longer than expected. The job will retry using its existing provider task.");
  }
}
