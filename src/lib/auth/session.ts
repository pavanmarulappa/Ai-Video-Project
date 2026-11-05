import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

const COOKIE_NAME = "frameforge_session";
const SESSION_DAYS = 7;

export type SessionUser = { id: string; email: string; name: string };

function getSigningKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters. Copy .env.example to .env and change it.");
  }
  return new TextEncoder().encode(secret);
}

async function secureCookieForRequest() {
  const forwardedProto = (await headers()).get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  return forwardedProto ? forwardedProto === "https" : process.env.NODE_ENV === "production";
}

export async function createSession(user: SessionUser) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const token = await new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSigningKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: await secureCookieForRequest(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { httpOnly: true, secure: await secureCookieForRequest(), sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSigningKey());
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.name !== "string") return null;
    return { id: payload.sub, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}
