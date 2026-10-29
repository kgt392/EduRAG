// import type { NextConfig } from "next";

// // Next.js 16.2+ blocks dev-only assets from unknown hostnames. When EduRAG is
// // opened from another PC by LAN IP, allow the host IPs discovered by
// // start-lan.bat. Keep this environment-driven so DHCP address changes do not
// // require editing this file each time.
// const allowedDevOrigins = (process.env.EDURAG_ALLOWED_DEV_ORIGINS ?? "")
//   .split(",")
//   .map((origin) => origin.trim())
//   .filter(Boolean);

// const nextConfig: NextConfig = {
//   ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
// };

// export default nextConfig;
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