import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  // Image optimization for your SaaS assets
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all domains for flexibility
      },
    ],
    formats: ['image/webp', 'image/avif'], // Modern image formats
  },

  // Environment variables that should be available on the client side
  env: {
    NEXT_PUBLIC_PRODUCTNAME: process.env.NEXT_PUBLIC_PRODUCTNAME,
    NEXT_PUBLIC_THEME: process.env.NEXT_PUBLIC_THEME,
    NEXT_PUBLIC_GOOGLE_TAG: process.env.NEXT_PUBLIC_GOOGLE_TAG,
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Webpack configuration for better bundling
  webpack: (config, { isServer }) => {
    // Optimize bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // External packages configuration
    if (isServer) {
      config.externals.push('@paddle/paddle-node-sdk');
    }
    
    return config;
  },

  // Output configuration for deployment
  output: 'standalone', // Optimized for Docker/containerized deployments

  // Performance optimizations
  compress: true,
  poweredByHeader: false, // Remove "powered by Next.js" header for security

  // Redirects for SEO and user experience
  async redirects() {
    return [
      // Add any necessary redirects here
    ];
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false, // Ensure TypeScript errors fail the build
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false, // Ensure ESLint errors fail the build
  },
};

export default nextConfig;
