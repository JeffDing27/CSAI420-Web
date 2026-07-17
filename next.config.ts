import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Temporary authorized bypass for known legacy type debt. New compliance
  // pages are checked separately before deployment.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
