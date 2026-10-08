import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    return {
      beforeFiles: [
        // Serve the Neon Void static game (public/game/index.html) at the root route
        { source: "/", destination: "/game/index.html" },
      ],
    };
  },
};

export default nextConfig;
