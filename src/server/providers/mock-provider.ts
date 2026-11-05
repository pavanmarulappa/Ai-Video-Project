import type { VideoProvider } from "./provider";

export const mockProvider: VideoProvider = {
  capabilities: {
    name: "mock",
    label: "Mock studio",
    aspectRatios: ["16:9", "9:16", "1:1"],
    durations: [5, 8, 10],
    resolutions: ["720p", "1080p"],
    note: "Mock mode returns the same public sample clip for every prompt. It is useful for checking the workflow, not prompt quality.",
  },
  async generate(_request, options) {
    if (!options.existingTaskId) {
      const taskId = `mock-${Date.now()}`;
      await options.onTaskCreated(taskId);
      await new Promise((resolve) => setTimeout(resolve, 6500));
      return {
        taskId,
        videoUrl: process.env.MOCK_VIDEO_URL || "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      };
    }

    return {
      taskId: options.existingTaskId,
      videoUrl: process.env.MOCK_VIDEO_URL || "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    };
  },
};
