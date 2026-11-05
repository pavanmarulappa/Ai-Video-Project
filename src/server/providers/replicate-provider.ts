import type { ProviderCapabilities, ProviderRequest, ProviderTaskOptions, VideoProvider } from "./provider";

type ReplicatePrediction = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: string | { message?: string };
};

function findVideoUrl(value: unknown): string | undefined {
  if (typeof value === "string") return /^https:\/\//i.test(value) ? value : undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findVideoUrl(item);
      if (url) return url;
    }
    return undefined;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["url", "video", "output", "files"]) {
      const url = findVideoUrl(record[key]);
      if (url) return url;
    }
  }
  return undefined;
}

export class ReplicateProvider implements VideoProvider {
  capabilities: ProviderCapabilities = {
    name: "replicate",
    label: "Replicate · Wan 3",
    aspectRatios: ["16:9", "9:16", "1:1"],
    durations: [5, 10, 15, 20, 25, 30],
    resolutions: ["720p", "1080p"],
    note: "Wan 3 supports up to 30 seconds at 1080p. Replicate bills successful generations; check the current price before submitting.",
  };

  private get token() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) throw new Error("Set REPLICATE_API_TOKEN on the server to use Replicate.");
    return token;
  }

  private get model() {
    const model = process.env.REPLICATE_MODEL || "alibaba/wan-3";
    if (!/^[a-z0-9_-]+\/[a-z0-9_.-]+$/i.test(model)) throw new Error("REPLICATE_MODEL must use owner/model format.");
    return model;
  }

  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Replicate request failed (${response.status}). ${detail.slice(0, 220)}`);
    }
    return response.json() as Promise<T>;
  }

  async generate(request: ProviderRequest, options: ProviderTaskOptions) {
    let taskId = options.existingTaskId ?? undefined;
    if (!taskId) {
      const modelPath = this.model.split("/").map(encodeURIComponent).join("/");
      const task = await this.request<ReplicatePrediction>(`https://api.replicate.com/v1/models/${modelPath}/predictions`, {
        method: "POST",
        body: JSON.stringify({
          input: {
            prompt: request.prompt,
            duration: request.duration,
            resolution: request.resolution,
            aspect_ratio: request.aspectRatio,
          },
        }),
      });
      if (!task.id) throw new Error("Replicate accepted the request but did not return a prediction ID.");
      taskId = task.id;
      await options.onTaskCreated(taskId);
    }

    const deadline = Date.now() + 20 * 60 * 1000;
    while (Date.now() < deadline) {
      const task = await this.request<ReplicatePrediction>(`https://api.replicate.com/v1/predictions/${encodeURIComponent(taskId)}`);
      if (task.status === "succeeded") {
        const videoUrl = findVideoUrl(task.output);
        if (!videoUrl) throw new Error("Replicate completed the prediction without returning a video URL.");
        return { taskId, videoUrl };
      }
      if (task.status === "failed" || task.status === "canceled") {
        const detail = typeof task.error === "string" ? task.error : task.error?.message;
        throw new Error(`Replicate generation ${task.status}. ${detail || "Please try again."}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    throw new Error("Replicate generation is taking longer than expected. The job will retry using its existing prediction.");
  }
}
