import "server-only";

/**
 * In-memory fixed-window rate limiter.
 *
 * Scoped to a single server instance, which is the right trade-off here: it
 * costs nothing, needs no extra service, and its job is to blunt password
 * guessing and stop the SMTP account being used as an open relay. If the app
 * ever scales past a handful of instances, swap the map for a shared store.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

// Bounded so a flood of distinct keys cannot grow the map without limit.
const MAX_TRACKED_KEYS = 5_000;

function sweep(now: number) {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) sweep(now);
    windows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/** Clears a key's window — used after a successful login. */
export function resetRateLimit(key: string) {
  windows.delete(key);
}
