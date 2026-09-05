import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import CookieConsent from '@/components/CookieBanner'
import StructuredData from '@/components/StructuredData'
import CursorGlow from '@/components/ui/CursorGlow'
import PageUtilities from '@/components/ui/PageUtilities'
import FloatingWhatsApp from '@/components/ui/FloatingWhatsApp'
import SubscribePopup from '@/components/SubscribePopup'

/**
 * Shared chrome for all public marketing / auth-flow pages.
 *
 * Navbar and Footer are rendered once here (previously every page imported
 * them itself). Route groups do not affect URLs — `/`, `/about`, `/blog`,
 * `/services/[slug]`, etc. are unchanged.
 *
 * The public-site widget cluster (cookie banner, subscribe popup, cursor
 * glow, scroll utilities, floating WhatsApp), the JSON-LD structured data,
 * analytics, and the service-worker registration also live here rather than
 * in the root layout, so none of them render on /admin/*, /client-portal/*,
 * /admin/login, or /admin-2fa-challenge.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <>
      <Suspense fallback={null}>
        <CursorGlow />
      </Suspense>

      <Suspense fallback={null}>
        <GoogleAnalytics />
      </Suspense>

      <StructuredData />

      <Navbar />
      {children}
      <Footer />

      <SubscribePopup />
      <CookieConsent />
      <PageUtilities />
      <FloatingWhatsApp />

      {/* Load analytics after page load */}
      {gaId && <NextGoogleAnalytics gaId={gaId} />}

      {/* Service Worker for caching */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(console.error);
              });
            }
          `,
        }}
      />
    </>
  )
}
