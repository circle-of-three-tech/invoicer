import type { NextConfig } from "next";

/**
 * Baseline security headers.
 *
 * Content-Security-Policy is deliberately *not* here: it carries a per-request
 * nonce and so is set in `src/proxy.ts`. Everything below is static, and
 * applies to API responses too, which the proxy does not run on.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The metadata `robots` field only covers HTML; this covers every response.
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
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
