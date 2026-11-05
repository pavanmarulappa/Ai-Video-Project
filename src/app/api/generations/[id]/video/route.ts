import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getVideoStorage, InvalidVideoRangeError } from "@/lib/storage/storage";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to access this video." }, { status: 401 });
  const { id } = await context.params;
  const generation = await prisma.generation.findFirst({
    where: { id, userId: session.id, status: "COMPLETED" },
    select: { outputKey: true },
  });
  if (!generation?.outputKey) return NextResponse.json({ error: "This video is not available." }, { status: 404 });

  try {
    const stored = await getVideoStorage().open(generation.outputKey, request.headers.get("range"));
    const download = new URL(request.url).searchParams.get("download") === "1";
    const headers: Record<string, string> = {
        "Content-Type": stored.contentType,
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="frameforge-${id}.mp4"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Accept-Ranges": "bytes",
      };
    if (stored.contentLength !== undefined) headers["Content-Length"] = String(stored.contentLength);
    if (stored.contentRange) headers["Content-Range"] = stored.contentRange;
    return new Response(stored.body, { status: stored.partial ? 206 : 200, headers });
  } catch (error) {
    if (error instanceof InvalidVideoRangeError) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${error.size}` } });
    console.error("Could not read generated video", error);
    return NextResponse.json({ error: "The stored video could not be opened. Please try again." }, { status: 500 });
  }
}
