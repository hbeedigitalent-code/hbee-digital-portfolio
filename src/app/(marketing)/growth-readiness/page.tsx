// src/app/growth-readiness/page.tsx

import { Hero } from '@/components/growth-readiness/Hero'
import { WhyWeCreated } from '@/components/growth-readiness/WhyWeCreated'
import { WhatYouReceive } from '@/components/growth-readiness/WhatYouReceive'
import { FrameworkPillars } from '@/components/growth-readiness/FrameworkPillars'
import { WhoItsFor } from '@/components/growth-readiness/WhoItsFor'
import { HowItWorks } from '@/components/growth-readiness/HowItWorks'
import { FAQ } from '@/components/growth-readiness/FAQ'
import { FinalCTA } from '@/components/growth-readiness/FinalCTA'

export const metadata = {
  title: 'Growth Readiness Assessment | Hbee Digitals',
  description: 'Evaluate your ecommerce business across 5 growth pillars. Get your HGRI™ score and growth profile. Free assessment for Shopify and WooCommerce brands.',
  openGraph: {
    title: 'Hbee Growth Readiness Assessment™',
    description: 'Discover your business growth potential with our comprehensive assessment.',
    url: 'https://www.hbeedigitals.com/growth-readiness',
  }
}

export default function GrowthReadinessPage() {
  return (
    <>
      <main className="min-h-screen bg-[var(--bg-page)]">
        <Hero />
        <WhyWeCreated />
        <WhatYouReceive />
        <FrameworkPillars />
        <WhoItsFor />
        <HowItWorks />
        <FAQ />
        <FinalCTA />
      </main>
    </>
  )
}