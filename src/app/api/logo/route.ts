import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { COMPANY_ID } from "@/lib/mappers";
import { requireSession } from "@/lib/session";

/**
 * Serves the business logo as a real, cacheable image.
 *
 * The logo is stored as a base64 data URL of up to 256 KB. Carrying it in the
 * workspace snapshot meant those bytes were read from Postgres, inlined into
 * the HTML *and* repeated in the RSC payload on every single page load, and
 * were never cacheable. Here they are fetched once against a content-versioned
 * URL (`?v=<logoVersion>`) and then served from the browser cache.
 *
 * It sits behind the session like the rest of the workspace.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
  } catch {
    return new NextResponse(null, { status: 401 });
  }

  const row = await prisma.company.findUnique({
    where: { id: COMPANY_ID },
    select: { logoDataUrl: true, logoVersion: true },
  });

  const dataUrl = row?.logoDataUrl;
  if (!dataUrl) return new NextResponse(null, { status: 404 });

  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/.exec(dataUrl);
  if (!match) {
    console.error("[logo] stored value is not a supported data URL");
    return new NextResponse(null, { status: 404 });
  }
  const [, contentType, base64] = match;

  // The version is the content hash, so a matching ETag really does mean the
  // bytes are unchanged.
  const etag = `"${row.logoVersion ?? "0"}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { etag } });
  }

  const body = Buffer.from(base64, "base64");
  return new NextResponse(body as unknown as BodyInit, {
    headers: {
      "content-type": contentType,
      "content-length": String(body.byteLength),
      etag,
      // `private` keeps it out of shared caches — it is behind a session — and
      // `immutable` is safe because the URL changes whenever the logo does.
      "cache-control": "private, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
