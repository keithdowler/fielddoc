import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@fielddoc/config",
    "@fielddoc/domain",
    "@fielddoc/validation",
  ],
};

export default nextConfig;
