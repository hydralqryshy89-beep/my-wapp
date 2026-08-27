// AES-256-GCM encryption for Meta access tokens at rest. This is real,
// reversible encryption (not password hashing) — the token must be
// decryptable server-side to call the Meta API in later phases.
//
// Storage format (single string, safe for a text column):
//   base64(iv) + ":" + base64(authTag) + ":" + base64(ciphertext)
//
// The key never lives in code — it comes from META_TOKEN_ENCRYPTION_KEY,
// expected to be a base64-encoded 32-byte (256-bit) key. Validation only
// happens when encrypt/decrypt is actually called, so the app doesn't
// crash on startup or on unrelated pages just because Meta isn't
// configured yet (see src/lib/meta/config.ts for the same lazy pattern).
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;

function getKey(): Buffer {
  const raw = process.env.META_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "META_TOKEN_ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\" and add it as a server-side Environment Variable."
    );
  }
  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new Error("META_TOKEN_ENCRYPTION_KEY is not valid base64.");
  }
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `META_TOKEN_ENCRYPTION_KEY must decode to exactly ${KEY_BYTES} bytes (a base64-encoded 256-bit key), got ${key.length}.`
    );
  }
  return key;
}

/** True when META_TOKEN_ENCRYPTION_KEY is present and well-formed — use this to
 * show an "غير مهيأ" state instead of letting encrypt/decrypt throw. */
export function isMetaEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptToken(payload: string): string {
  const key = getKey();
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted token payload.");
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
