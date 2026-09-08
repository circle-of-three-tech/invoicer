import type { NextConfig } from "next";

/**
 * Baseline security headers.
 *
 * The app renders user-supplied logos as `data:` images and inlines its own
 * styles, which the policy allows; everything else — plugins, framing, foreign
 * form targets — is denied outright.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js injects inline bootstrap scripts; `unsafe-eval` is dev-only but
      // harmless to keep off in production builds.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  reactStrictMode: true,
  // Nothing gains from advertising the framework version.
  poweredByHeader: false,
  // Source maps would ship the full server/client source to any visitor.
  productionBrowserSourceMaps: false,
  experimental: {
    // framer-motion is imported piecemeal across pages; this keeps each route's
    // bundle to the parts it actually uses.
    optimizePackageImports: ["framer-motion"],
  },
  serverExternalPackages: ["nodemailer"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
