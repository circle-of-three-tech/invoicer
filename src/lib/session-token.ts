import { authSecret } from "./env";
import { SESSION_MAX_AGE_SECONDS } from "./env";

/**
 * Token primitives, kept free of `next/headers` so Proxy — which reads cookies
 * off the request object rather than through the async cookie store — can share
 * exactly the same verification code as the server actions.
 */

export const SESSION_COOKIE = "co3_session";

const encoder = new TextEncoder();

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(authSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(payload: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await key(),
    encoder.encode(payload),
  );
  return `${payload}.${Buffer.from(signature).toString("base64url")}`;
}

/** Comparison whose cost does not depend on where the two values diverge. */
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  let diff = aBytes.length ^ bBytes.length;
  const len = Math.max(aBytes.length, bBytes.length);
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

/** Constant-time password check, used by the login action. */
export function passwordMatches(candidate: string, expected: string): boolean {
  return timingSafeEqual(candidate, expected);
}

/** A signed token that expires `SESSION_MAX_AGE_SECONDS` from now. */
export async function createSessionToken(): Promise<string> {
  return sign(String(Date.now() + SESSION_MAX_AGE_SECONDS * 1000));
}

/** Verifies a token's signature and its expiry. */
export async function verifySessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  if (!timingSafeEqual(token, await sign(payload))) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}
