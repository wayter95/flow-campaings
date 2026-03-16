import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone", // Required for Docker/Railway deployment
  serverExternalPackages: ["@neondatabase/serverless", "@prisma/adapter-neon", "ws"],
};

export default nextConfig;
