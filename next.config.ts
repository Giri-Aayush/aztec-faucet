import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  // Aztec SDK packages are ESM-only with native modules;
  // keep them server-side only to avoid bundling issues
  serverExternalPackages: [
    "@aztec/aztec.js",
    "@aztec/accounts",
    "@aztec/noir-contracts.js",
    "@aztec/wallets",
    "@aztec/pxe",
    "@aztec/kv-store",
    "@aztec/ethereum",
    "@aztec/l1-artifacts",
    "@aztec/foundation",
    "@aztec/stdlib",
  ],
};

export default nextConfig;
