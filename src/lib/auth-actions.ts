"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { appPassword } from "./env";
import { rateLimit, resetRateLimit } from "./rate-limit";
import { endSession, passwordMatches, startSession } from "./session";

export type LoginState = { error?: string };

async function clientKey(): Promise<string> {
  const headerList = await headers();
  // Vercel sets x-forwarded-for; fall back to a shared bucket so a missing
  // header degrades to a global limit rather than to no limit at all.
  const forwarded = headerList.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/**
 * Verifies the shared passphrase and starts a session.
 *
 * Attempts are rate limited per client so the single password cannot be
 * brute-forced, and the response is deliberately vague about why it failed.
 */
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const key = `login:${await clientKey()}`;
  const limit = rateLimit(key, 8, 10 * 60);
  if (!limit.ok) {
    return {
      error: `Too many attempts. Try again in ${Math.ceil(
        limit.retryAfterSeconds / 60,
      )} minutes.`,
    };
  }

  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password, appPassword())) {
    return { error: "That password is not correct." };
  }

  resetRateLimit(key);
  await startSession();
  redirect("/");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}
