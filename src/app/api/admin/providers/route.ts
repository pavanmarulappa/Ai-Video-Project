import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/admin";
import {
  getActiveVideoProviderName,
  getVideoProviderOptions,
  isVideoProviderConfigured,
  isVideoProviderName,
  setActiveVideoProviderName,
} from "@/server/providers";

export const runtime = "nodejs";

async function authorized() {
  const session = await getSession();
  return session && isAdminEmail(session.email) ? session : null;
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  return NextResponse.json({ activeProvider: await getActiveVideoProviderName(), providers: getVideoProviderOptions() });
}

export async function PUT(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  const parsed = z.object({ provider: z.string() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose one of the supported providers." }, { status: 400 });
  }
  if (!isVideoProviderName(parsed.data.provider)) {
    return NextResponse.json({ error: "Choose one of the supported providers." }, { status: 400 });
  }
  if (!isVideoProviderConfigured(parsed.data.provider)) {
    return NextResponse.json({ error: "Add this provider's API key to the server environment and restart the app and worker first." }, { status: 422 });
  }
  await setActiveVideoProviderName(parsed.data.provider);
  return NextResponse.json({ activeProvider: parsed.data.provider });
}
