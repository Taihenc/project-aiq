import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'gsap', '@gsap/react'],
  },
  turbopack: {
    root: '../../',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
