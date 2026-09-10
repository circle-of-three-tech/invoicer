import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

/**
 * Two jobs, both of which have to happen before the page renders.
 *
 * 1. **Content-Security-Policy.** A fresh nonce per request lets `script-src`
 *    drop `'unsafe-inline'`, which is the difference between a policy that
 *    stops XSS and one that only looks like it does. Next.js reads the nonce
 *    back out of this header during SSR and stamps it onto its own bootstrap
 *    and bundle tags, so nothing here needs to know about individual scripts.
 *
 * 2. **The optimistic auth gate.** This keeps unauthenticated visitors out of
 *    the app shell; it is not the security boundary. The app layout re-checks
 *    at render time and every server action calls `requireSession`, because a
 *    POST can always be sent without passing through here.
 */

const IS_DEV = process.env.NODE_ENV === "development";

function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    // `strict-dynamic` lets the nonced entry scripts pull in their own chunks,
    // and makes browsers ignore host allowlists — so an injected <script> has
    // no way in without guessing the nonce. React needs `eval` in development
    // to rebuild server stack traces; it does not in production.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${IS_DEV ? " 'unsafe-eval'" : ""}`,
    // Styles keep `unsafe-inline`: the UI leans on inline `style` attributes for
    // per-accent colours and Framer Motion writes styles at runtime. Style
    // injection is a far smaller risk than script injection, and this is the
    // one relaxation the policy makes.
    "style-src 'self' 'unsafe-inline'",
    // Fonts are self-hosted by next/font, so no foreign origin is needed.
    "font-src 'self'",
    // `data:` for logo previews the settings form has not saved yet.
    "img-src 'self' data: blob:",
    // `next dev` talks to its HMR server over a websocket.
    `connect-src 'self'${IS_DEV ? " ws: wss:" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // Omitted in development, where the dev server is plain http and this would
    // rewrite every request to https.
    ...(IS_DEV ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = contentSecurityPolicy(nonce);

  // Next.js picks the nonce up from the request-side header during rendering.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const isLogin = request.nextUrl.pathname === "/login";
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = await verifySessionToken(token);

  let response: NextResponse;
  if (signedIn || isLogin) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    response = NextResponse.redirect(url);
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Page routes only. API routes carry their own authorization — /api/logo
      // calls `requireSession`, /api/health is public by design — and serve
      // JSON or images that a CSP does not apply to. Next's own assets and
      // static files are skipped so they stay cacheable.
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
      // A prefetch is not a document, so it needs no nonce; the layout's own
      // session check covers the auth side for those.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
