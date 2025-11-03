/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove ignoreBuildErrors for production
  images: {
    domains: ['cdn.shopify.com'], // Add your Shopify CDN domain
  },
  // Enable React strict mode
  reactStrictMode: true,
  // Optimize for Vercel
  experimental: {
    optimizeCss: true,
  }
}

module.exports = nextConfig
