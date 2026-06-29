import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000, // check for changes every second
      aggregateTimeout: 300,
    };
    return config;
  },
};

export default nextConfig;
