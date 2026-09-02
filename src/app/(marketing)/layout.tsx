import type { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

/**
 * Shared chrome for all public marketing / auth-flow pages.
 *
 * Previously every page imported and rendered <Navbar /> and <Footer />
 * itself (27 files). They are now rendered once here. Route groups do not
 * affect URLs — `/about`, `/blog`, `/services/[slug]`, etc. are unchanged.
 *
 * The homepage (`src/app/page.tsx`) intentionally stays at the app root with
 * its own chrome for now; it moves under this group during the homepage
 * rebuild.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
