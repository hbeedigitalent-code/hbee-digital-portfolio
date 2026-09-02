// src/app/client-onboarding/thank-you/page.tsx
'use client'

import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import { motion } from 'framer-motion'

export default function OnboardingThankYouPage() {
  return (
    <>
      <main className="min-h-screen bg-[var(--bg-page)] py-20 md:py-32">
        <div className="container-custom">
          <div className="mx-auto max-w-2xl text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="mb-8 flex justify-center"
            >
              <div className="rounded-full bg-[var(--accent)]/10 p-6">
                <SvgIcon name="check" size={64} color="var(--accent)" />
              </div>
            </motion.div>

            <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Project Successfully Submitted ✓
            </h1>
            
            <p className="text-[var(--text-secondary)] text-lg mb-6">
              Thank you for completing your onboarding.
            </p>

            <p className="text-[var(--text-secondary)]">
              Your project details, files, and requirements have been received.
            </p>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8 text-left mt-6">
              <p className="text-[var(--text-secondary)]">
                A member of the Hbee Digitals team will review your submission 
                and contact you regarding next steps.
              </p>
              <p className="mt-2 text-sm text-[var(--accent)] font-semibold">
                Estimated review time: 1–2 business days
              </p>
            </div>

            <div className="mt-8 text-left">
              <h3 className="mb-3 font-bold text-[var(--text-primary)] text-lg">What happens next:</h3>
              <ul className="space-y-3 text-[var(--text-secondary)]">
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-[var(--accent)] font-bold">1.</span>
                  <span>Review by project management team</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-[var(--accent)] font-bold">2.</span>
                  <span>Project kickoff planning</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-[var(--accent)] font-bold">3.</span>
                  <span>Team assignment and scheduling</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-[var(--accent)] font-bold">4.</span>
                  <span>Project kickoff meeting</span>
                </li>
              </ul>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--bg-section)]"
              >
                <SvgIcon name="chevron-left" size={16} color="var(--text-primary)" />
                Return to Homepage
              </Link>
              <Link
                href="/growth-readiness"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
              >
                Growth Readiness
                <SvgIcon name="arrow-right" size={16} color="white" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}