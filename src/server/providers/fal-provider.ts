import type { ProviderCapabilities, ProviderRequest, ProviderTaskOptions, VideoProvider } from "./provider";

type FalTask = { request_id?: string; status?: string; error?: string; detail?: string };

function getVideoUrl(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const video = record.video;
  if (video && typeof video === "object" && typeof (video as Record<string, unknown>).url === "string") {
    return (video as Record<string, string>).url;
  }
  if (typeof record.url === "string") return record.url;
  return undefined;
}

export class FalProvider implements VideoProvider {
  capabilities: ProviderCapabilities = {
    name: "fal",
    label: "fal.ai · Wan 3",
    aspectRatios: ["16:9", "9:16", "1:1"],
    durations: [5, 10, 15, 20, 25, 30],
    resolutions: ["720p", "1080p"],
    note: "Wan 3 supports up to 30 seconds, portrait 1080p, and generated audio. fal uses prepaid, per-generation credits; check live pricing before submitting.",
  };

  private get apiKey() {
    const key = process.env.FAL_KEY;
    if (!key) throw new Error("Set FAL_KEY on the server to use fal.ai.");
    return key;
  }

  private get endpoint() {
    const endpoint = process.env.FAL_VIDEO_ENDPOINT || "alibaba/wan-3.0/text-to-video";
    if (!/^[a-z0-9_-]+\/[a-z0-9_.-]+\/[a-z0-9_./-]+$/i.test(endpoint)) {
      throw new Error("FAL_VIDEO_ENDPOINT must be an endpoint path such as alibaba/wan-3.0/text-to-video.");
    }
    return endpoint;
  }

  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Key ${this.apiKey}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`fal.ai request failed (${response.status}). ${detail.slice(0, 220)}`);
    }
    return response.json() as Promise<T>;
  }

  async generate(request: ProviderRequest, options: ProviderTaskOptions) {
    let taskId = options.existingTaskId ?? undefined;
    const endpoint = this.endpoint;
    const [owner, app] = endpoint.split("/");
    const baseUrl = `https://queue.fal.run/${endpoint}`;
    if (!taskId) {
      const task = await this.request<FalTask>(baseUrl, {
        method: "POST",
        body: JSON.stringify({
          prompt: request.prompt,
          duration: request.duration,
          resolution: request.resolution,
          aspect_ratio: request.aspectRatio,
          audio: true,
        }),
      });
      if (!task.request_id) throw new Error("fal.ai accepted the request but did not return a request ID.");
      taskId = task.request_id;
      await options.onTaskCreated(taskId);
    }

    const requestRoot = `https://queue.fal.run/${owner}/${app}/requests/${encodeURIComponent(taskId)}`;
    const deadline = Date.now() + 20 * 60 * 1000;
    while (Date.now() < deadline) {
      const task = await this.request<FalTask>(`${requestRoot}/status`);
      if (task.status === "COMPLETED") {
        const result = await this.request<unknown>(requestRoot);
        const videoUrl = getVideoUrl(result);
        if (!videoUrl) throw new Error("fal.ai completed the request without returning a video URL.");
        return { taskId, videoUrl };
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    throw new Error("fal.ai generation is taking longer than expected. The job will retry using its existing request.");
  }
}
