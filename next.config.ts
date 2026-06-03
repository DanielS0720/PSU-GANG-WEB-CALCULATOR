import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Next dev (HMR / React Refresh / webpack eval source-maps) needs 'unsafe-eval'.
// Production bundles contain no eval, so it is omitted there to keep CSP tight.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value:
      // 'unsafe-inline' on script-src kept for now: Next App Router injects inline
      // hydration/flight scripts. Tighten to nonce-based CSP before production if desired.
      `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; ${scriptSrc}; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`,
  },
];

const nextConfig: NextConfig = {
  // Cloudflare Pages no soporta el optimizador de imágenes de Next (/_next/image).
  // Servir los logos PNG tal cual.
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
