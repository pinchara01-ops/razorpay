import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  agentRules: false,
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next-build",
  outputFileTracingRoot: path.resolve("."),
  reactStrictMode: true
};

export default nextConfig;
