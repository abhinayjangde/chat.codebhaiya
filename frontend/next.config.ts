import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    domains: ["avatars.githubusercontent.com"],
  },
};

export default nextConfig;
