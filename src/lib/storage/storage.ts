import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createWriteStream, createReadStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export type StoredVideo = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength?: number;
  contentRange?: string;
  partial: boolean;
};

export interface VideoStorage {
  saveFromUrl(generationId: string, videoUrl: string): Promise<string>;
  open(key: string, range?: string | null): Promise<StoredVideo>;
}

export class InvalidVideoRangeError extends RangeError {
  constructor(readonly size: number) {
    super("Requested video byte range is invalid.");
  }
}

function parseRange(range: string | null | undefined, size: number) {
  if (!range) return { start: 0, end: Math.max(0, size - 1), partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || size === 0) throw new InvalidVideoRangeError(size);
  let start: number;
  let end: number;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!suffixLength) throw new InvalidVideoRangeError(size);
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) {
    throw new InvalidVideoRangeError(size);
  }
  end = Math.min(end, size - 1);
  return { start, end, partial: true };
}

class LocalVideoStorage implements VideoStorage {
  private get directory() {
    const configured = process.env.VIDEO_STORAGE_DIR || "data/videos";
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  }

  async saveFromUrl(generationId: string, videoUrl: string) {
    const url = new URL(videoUrl);
    if (url.protocol !== "https:") throw new Error("Video provider returned a non-HTTPS video URL.");
    const response = await fetch(url, { signal: AbortSignal.timeout(120_000), cache: "no-store" });
    if (!response.ok || !response.body) throw new Error(`Could not download the generated video (HTTP ${response.status}).`);
    const contentType = response.headers.get("content-type") || "video/mp4";
    if (!contentType.startsWith("video/") && contentType !== "application/octet-stream") {
      throw new Error("The provider returned a file that is not a video.");
    }

    await mkdir(this.directory, { recursive: true });
    const key = `${generationId}.mp4`;
    const target = path.join(this.directory, key);
    const temporary = `${target}.part`;
    try {
      await pipeline(Readable.fromWeb(response.body as never), createWriteStream(temporary));
      await rename(temporary, target);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
    return key;
  }

  async open(key: string, range?: string | null) {
    const safeKey = path.basename(key);
    const filePath = path.join(this.directory, safeKey);
    const fileInfo = await stat(filePath);
    const byteRange = parseRange(range, fileInfo.size);
    return {
      body: Readable.toWeb(createReadStream(filePath, { start: byteRange.start, end: byteRange.end })) as ReadableStream<Uint8Array>,
      contentType: "video/mp4",
      contentLength: byteRange.end - byteRange.start + 1,
      contentRange: byteRange.partial ? `bytes ${byteRange.start}-${byteRange.end}/${fileInfo.size}` : undefined,
      partial: byteRange.partial,
    };
  }
}

class S3VideoStorage implements VideoStorage {
  private readonly bucket = process.env.S3_BUCKET;
  private readonly client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? { credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } }
      : {}),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });

  private getBucket() {
    if (!this.bucket) throw new Error("Set S3_BUCKET when STORAGE_DRIVER=s3.");
    return this.bucket;
  }

  async saveFromUrl(generationId: string, videoUrl: string) {
    const url = new URL(videoUrl);
    if (url.protocol !== "https:") throw new Error("Video provider returned a non-HTTPS video URL.");
    const response = await fetch(url, { signal: AbortSignal.timeout(120_000), cache: "no-store" });
    if (!response.ok || !response.body) throw new Error(`Could not download the generated video (HTTP ${response.status}).`);
    const contentType = response.headers.get("content-type") || "video/mp4";
    if (!contentType.startsWith("video/") && contentType !== "application/octet-stream") {
      throw new Error("The provider returned a file that is not a video.");
    }
    const key = `videos/${generationId}.mp4`;
    await new Upload({
      client: this.client,
      params: {
        Bucket: this.getBucket(),
        Key: key,
        Body: Readable.fromWeb(response.body as never),
        ContentType: contentType,
      },
    }).done();
    return key;
  }

  async open(key: string, range?: string | null) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.getBucket(), Key: key, ...(range ? { Range: range } : {}) }));
    if (!result.Body) throw new Error("The stored video could not be opened.");
    return {
      body: result.Body.transformToWebStream() as ReadableStream<Uint8Array>,
      contentType: result.ContentType || "video/mp4",
      contentLength: result.ContentLength,
      contentRange: result.ContentRange,
      partial: Boolean(result.ContentRange),
    };
  }
}

let storage: VideoStorage | undefined;

export function getVideoStorage(): VideoStorage {
  if (storage) return storage;
  const driver = (process.env.STORAGE_DRIVER || "local").toLowerCase();
  if (driver === "local") storage = new LocalVideoStorage();
  else if (driver === "s3") storage = new S3VideoStorage();
  else throw new Error(`Unknown STORAGE_DRIVER: ${driver}. Use local or s3.`);
  return storage;
}
