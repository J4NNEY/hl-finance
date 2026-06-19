import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers are handled in middleware
  
  // Disable X-Powered-By header
  poweredByHeader: false,
  
  // Enable strict mode for React
  reactStrictMode: true,
  
  // Image optimization configuration
  images: {
    domains: [],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
