// Signed, short-lived OAuth `state` for the Meta connect flow. Reuses the
// app's existing AUTH_SECRET (same secret that signs session cookies —
// see src/lib/session.ts) rather than requiring a new env var, since this
// token is only ever verified by this server, never trusted from a third party.
//
// CSRF defense is two-layer: the state itself is signed (so it can't be
// forged), AND it's mirrored into a short-lived httpOnly cookie set right
// before redirecting to Meta. The callback route requires both to match,
// which stops an attacker from replaying a state value they observed
// (they'd also need the victim's browser cookie).
import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "node:crypto";

export const META_OAUTH_STATE_COOKIE = "mp_meta_oauth_state";
const STATE_DURATION_SECONDS = 10 * 60; // 10 minutes — just long enough to complete the OAuth dialog

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Generate one and add it as an environment variable.");
  }
  return new TextEncoder().encode(secret);
}

export interface MetaOAuthStatePayload {
  purpose: "meta-oauth-state";
  nonce: string;
  userId: string;
}

/** Returns the signed state token (put it both in the outbound `state` query param and the cookie). */
export async function createMetaOAuthState(userId: string): Promise<string> {
  const nonce = randomBytes(16).toString("hex");
  return new SignJWT({ purpose: "meta-oauth-state", nonce, userId } satisfies MetaOAuthStatePayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${STATE_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

/** Verifies the `state` query param against the cookie value and the current user. Returns null on any mismatch. */
export async function verifyMetaOAuthState(
  stateFromQuery: string | null,
  stateFromCookie: string | undefined,
  currentUserId: string
): Promise<boolean> {
  if (!stateFromQuery || !stateFromCookie) return false;
  // Exact string match first — cheap and stops most tampering before we even verify the signature.
  if (stateFromQuery !== stateFromCookie) return false;

  try {
    const { payload } = await jwtVerify(stateFromQuery, getSecretKey());
    if (payload.purpose !== "meta-oauth-state") return false;
    if (payload.userId !== currentUserId) return false;
    return true;
  } catch {
    return false;
  }
}
