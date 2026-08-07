import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    MY_API_KEY: process.env.MY_API_KEY || "",
    NEXT_PUBLIC_MY_API_KEY: process.env.NEXT_PUBLIC_MY_API_KEY || "",
  },
};

export default nextConfig;
