import type { NextConfig } from "next";

// Intersect NextConfig with a custom type to clear the TS error
const nextConfig: NextConfig & { allowedDevOrigins?: string[] } = {
  turbopack: {},
  // Keep this at the root level for Next.js 15+ to process it correctly
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "987c-102-88-114-72.ngrok-free.app",
  ],

  webpack: (config) => {
    config.watchOptions = {
      poll: 1000, // check for changes every second
      aggregateTimeout: 300,
    };
    return config;
  },
};

export default nextConfig;
