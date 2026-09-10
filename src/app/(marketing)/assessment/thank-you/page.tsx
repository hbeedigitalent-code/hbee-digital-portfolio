// src/app/(marketing)/assessment/thank-you/page.tsx
//
// Shown after a completed Growth Readiness Assessment submission.
//
// REBUILT. The previous version presented submission as a result: a 100-piece
// confetti burst, animated sparkles, pulsing rings and a "🎉 Assessment
// Received!" headline, plus a promised "detailed Growth Profile with your
// HGRI™ score", an "Estimated review time: 24–48 hours" commitment, and social
// proof reading "500+ businesses" and "4.9/5 (150+ reviews)". Roughly 60% of
// the file was decoration carrying the wrong signal — a merchant could
// reasonably read it as having been accepted.
//
// This page now says one thing plainly: the assessment has been RECEIVED FOR
// REVIEW. It makes no score promise, no turnaround promise, and no approval
// claim, and it carries no unverified social proof. There is deliberately no
// "create your account" CTA — account-to-merchant linking does not work yet,
// so that path would lead nowhere.

'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

const NEXT_STEPS = [
  'Hbee Digitals reviews your responses and looks at your store.',
  'We identify your priorities and prepare a recommended growth action plan.',
  'You receive an email with the outcome of the review.',
  'Approved merchants get instructions for accessing their free Growth Profile.',
]

export default function AssessmentThankYouPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-page)] py-16 md:py-24">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 md:p-10 shadow-[var(--shadow-lg)]"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-orange)]/10">
                <SvgIcon name="check" size={32} color="var(--accent-orange)" />
              </div>

              <h1 className="mt-6 text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
                Assessment received for review
              </h1>

              <p className="mt-3 text-base text-[var(--text-secondary)]">
                Thank you for completing the Hbee Growth Readiness Assessment. Your
                responses have been submitted and are now with our team.
              </p>
            </div>

            {/* What this does and does not mean — stated before anything else, so
                submission is never mistaken for acceptance into the initiative. */}
            <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-section)] p-5 text-left">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  <SvgIcon name="about" size={18} color="var(--text-muted)" />
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Submitting the assessment does not mean you have been approved.
                  Every submission is reviewed by Hbee Digitals before any decision
                  is made, and we will contact you by email either way.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 text-left">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                What happens next
              </h2>
              <ol className="mt-4 space-y-3">
                {NEXT_STEPS.map((step, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-orange)]/10 text-xs font-bold text-[var(--accent-orange)]">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
              Keep an eye on your inbox — including your spam folder, in case our
              email lands there.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/growth-readiness">
                <Button variant="secondary" className="w-full sm:w-auto">
                  <SvgIcon name="chevron-left" size={16} />
                  Back to Growth Readiness
                </Button>
              </Link>
              <Link href="/">
                <Button className="w-full sm:w-auto">
                  Go to Homepage
                  <SvgIcon name="arrow-right" size={16} color="white" />
                </Button>
              </Link>
            </div>
          </motion.div>

          <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
            Questions about your submission?{' '}
            <Link
              href="/contact"
              className="font-semibold text-[var(--accent-orange)] hover:underline"
            >
              Contact us
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
