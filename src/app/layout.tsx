import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

import Providers from './providers'
import { ThemeProvider } from '@/context/ThemeContext'

// Optimize font loading
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
})

const siteUrl = 'https://hbeedigitals.com'
const siteName = 'Hbee Digitals'
const siteTitle = 'Hbee Digitals — Digital Growth Studio'
const siteDescription =
  'Premium websites, Shopify optimization, digital infrastructure, and conversion-focused growth systems for ambitious brands.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    'Hbee Digitals', 'Shopify expert', 'website design', 'Shopify optimization',
    'conversion optimization', 'digital growth studio', 'ecommerce growth',
    'branding', 'UI UX design', 'web development', 'digital agency',
  ],
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  alternates: { canonical: siteUrl },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    siteName,
    images: [{ url: `${siteUrl}/svgs/og-image.jpg`, width: 1200, height: 630, alt: 'Hbee Digitals — Digital Growth Studio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    creator: '@hbeedigitals',
    images: [`${siteUrl}/svgs/twitter-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { 
      index: true, 
      follow: true, 
      'max-video-preview': -1, 
      'max-image-preview': 'large', 
      'max-snippet': -1 
    },
  },
  category: 'technology',
}

export const viewport: Viewport = {
  themeColor: '#07111F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        {/*
          Set the theme before first paint. A saved choice wins; otherwise the
          site defaults to dark. Kept in sync with src/context/ThemeContext.tsx.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark')t='dark';var e=document.documentElement;e.classList.toggle('dark',t==='dark');e.setAttribute('data-theme',t);}catch(_){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />

        {/*
          Critical above-the-fold CSS. Fonts are loaded once via next/font
          (no <link>/@import font loading). The button system lives in
          globals.css — no .btn-* rules here to avoid competing definitions.
        */}
        <style dangerouslySetInnerHTML={{
          __html: `
            *{margin:0;padding:0;box-sizing:border-box}
            nav{position:fixed;top:0;left:0;right:0;z-index:50;background:var(--bg-page);backdrop-filter:blur(8px);border-bottom:1px solid var(--border)}
            .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}
          `
        }} />
      </head>
      <body
        className="antialiased"
        style={{ fontFamily: "var(--font-sans)" }}
        suppressHydrationWarning
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-gray-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
          Skip to main content
        </a>

        {/*
          Marketing-only site chrome (Navbar/Footer, cookie banner, subscribe
          popup, cursor glow, scroll utilities, floating WhatsApp, structured
          data, analytics, service-worker registration) now lives in
          src/app/(marketing)/layout.tsx so it never renders on /admin/*,
          /client-portal/*, /admin/login, or /admin-2fa-challenge. The root
          layout stays authentication-independent: html/body, fonts, the
          pre-paint theme script, ThemeProvider, and web-vitals Providers.
        */}
        <ThemeProvider>
          <Providers>
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}