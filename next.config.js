/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['cdn.shopify.com'],
    unoptimized: true, // Better CDN compatibility
  },
  // Force better CDN distribution
  experimental: {
    optimizeCss: false, // Disable if causing issues
  },
  // Add headers for better caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
