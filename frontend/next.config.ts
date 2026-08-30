import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["172.16.185.67", "localhost"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
