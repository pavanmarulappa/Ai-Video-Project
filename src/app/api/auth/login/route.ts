import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const schema = z.object({ email: z.email("Enter a valid email address.").trim().toLowerCase(), password: z.string().min(1, "Enter your password.") });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check your email and password." }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !(await compare(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    await createSession({ id: user.id, email: user.email, name: user.name });
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("Sign-in failed", error);
    return NextResponse.json({ error: "Sign-in is temporarily unavailable. Check the app configuration and try again." }, { status: 503 });
  }
}
