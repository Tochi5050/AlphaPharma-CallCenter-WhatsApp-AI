import type { NextConfig } from "next";

// Intersect NextConfig with a custom type to clear the TS error
const nextConfig: NextConfig & { allowedDevOrigins?: string[] } = {
  turbopack: {},
  // Keep this at the root level for Next.js 15+ to process it correctly
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "https://a1ff-102-92-22-32.ngrok-free.app",
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
