import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bullmq", "ioredis", "@aws-sdk/client-s3", "@aws-sdk/lib-storage"],
};

export default nextConfig;
