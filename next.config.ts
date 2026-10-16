import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Match the existing client timeout for video uploads.
  experimental: { proxyTimeout: 180_000 },
  rewrites() {
    const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    if (!configured && process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_API_BASE_URL must be set before building the admin proxy.");
    }
    const target = new URL(configured || "http://localhost:4000");
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password ||
        target.pathname !== '/' || target.search || target.hash) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL must be an HTTP(S) origin without credentials or a path.");
    }
    return [
      { source: "/api/v1/admin/:path*", destination: `${target.origin}/api/v1/admin/:path*` },
      { source: "/uploads/:path*", destination: `${target.origin}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
