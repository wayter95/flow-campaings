import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone", // Required for Docker/Railway deployment
  serverExternalPackages: ["pg"],
};

export default nextConfig;
