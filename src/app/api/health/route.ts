import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Liveness/readiness probe for uptime monitors and deploy checks. It confirms
 * the process is up *and* that it can reach Postgres, which is the dependency
 * that actually fails. Public by design, so it reveals nothing beyond up/down.
 */
export const dynamic = "force-dynamic";

/**
 * The probe is unauthenticated, so without this a flood of requests would turn
 * into a flood of database round-trips and exhaust the connection pool that
 * real traffic needs. Monitors poll on the order of a minute; re-using a recent
 * result for a few seconds is invisible to them and caps the cost of abuse.
 */
const CACHE_MS = 5_000;
let cached: { at: number; ok: boolean } | null = null;

async function databaseReachable(): Promise<boolean> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_MS) return cached.ok;

  let ok = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("[health] database unreachable", error);
    ok = false;
  }
  cached = { at: now, ok };
  return ok;
}

export async function GET() {
  const ok = await databaseReachable();
  return NextResponse.json(
    { status: ok ? "ok" : "degraded" },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
