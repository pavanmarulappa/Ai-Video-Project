import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(60),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(10, "Use at least 10 characters for your password.").max(100),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the form and try again." }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hash(password, 12) },
      select: { id: true, name: true, email: true },
    });
    await createSession(user);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "An account with that email already exists. Try signing in." }, { status: 409 });
    }
    console.error("Account registration failed", error);
    return NextResponse.json({ error: "We couldn't create your account. Please try again." }, { status: 500 });
  }
}
