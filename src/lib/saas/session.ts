import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Namespaced separately from the Marketing Plan app's "mp_session" cookie —
// the two products share a browser but never a session.
export const SAAS_SESSION_COOKIE = "saas_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Generate one and add it as an environment variable.");
  }
  return new TextEncoder().encode(secret);
}

export interface SaasSessionPayload {
  userId: string;
}

export async function createSaasSession(userId: string): Promise<void> {
  const token = await new SignJWT({ userId } satisfies SaasSessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SAAS_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySaasSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SAAS_SESSION_COOKIE);
}

export async function readSaasSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SAAS_SESSION_COOKIE)?.value;
}

export async function verifySaasSessionToken(token: string): Promise<SaasSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function getSaasSession(): Promise<SaasSessionPayload | null> {
  const token = await readSaasSessionToken();
  if (!token) return null;
  return verifySaasSessionToken(token);
}
