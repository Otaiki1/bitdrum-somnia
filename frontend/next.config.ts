import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pythnetwork/pyth-starknet-js"]
};

export default nextConfig;
