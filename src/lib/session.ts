import "server-only";
import { cookies } from "next/headers";
import { IS_PRODUCTION, SESSION_MAX_AGE_SECONDS } from "./env";
import {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
} from "./session-token";

/**
 * Cookie-backed session.
 *
 * The app is single-tenant (one business, one shared passphrase), so a session
 * carries no identity beyond "this browser proved it knows the password". An
 * HMAC-signed expiry stamp is therefore enough — no session table, no extra
 * dependency, and no database read on the auth path.
 */

export { SESSION_COOKIE, verifySessionToken } from "./session-token";
export { passwordMatches } from "./session-token";

export async function startSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * The authorization boundary for every server action. Server Actions are public
 * POST endpoints, so gating the UI is not enough — each action calls this
 * before it touches data.
 */
export async function requireSession(): Promise<void> {
  if (!(await hasSession())) {
    throw new Error("Unauthorized");
  }
}
