import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.29.184",
    "localhost",
    "127.0.0.1",
  ],

  skipTrailingSlashRedirect: true,

  experimental: {
    proxyClientMaxBodySize: "100mb",
  },

  async rewrites() {
    return [
      {
        source: "/backend/:path*/",
        destination: "http://127.0.0.1:8000/:path*/",
      },
      {
        source: "/backend/:path*",
        destination: "http://127.0.0.1:8000/:path*",
      },
    ];
  },
};

export default nextConfig;