import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // デプロイ時はビルドエラーとしない
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScriptエラーもビルドエラーとしない（本番環境では要注意）
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
