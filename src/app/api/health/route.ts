import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Liveness/readiness probe for uptime monitors and deploy checks. It confirms
 * the process is up *and* that it can reach Postgres, which is the dependency
 * that actually fails. Public by design (excluded from the auth proxy), so it
 * reveals nothing beyond up/down.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[health] database unreachable", error);
    return NextResponse.json(
      { status: "degraded" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
