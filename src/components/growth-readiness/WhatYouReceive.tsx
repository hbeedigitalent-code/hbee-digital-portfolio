// src/components/growth-readiness/WhatYouReceive.tsx

'use client'

import SvgIcon from '@/components/ui/SvgIcon'
import { motion } from 'framer-motion'

// What an APPROVED merchant actually receives. Every item here is either
// already delivered or explicitly labelled as in development below — nothing
// on this list is aspirational.
const benefits = [
  {
    icon: 'growth-profile',
    title: 'Your Growth Profile',
    description: 'Free for life once approved, whether or not you take on a paid project. Your assessment results and business overview live here.'
  },
  {
    icon: 'growth-recommendations',
    title: 'Hbee-Reviewed Findings',
    description: 'We review your business and set out the findings, your priorities, and a recommended growth action plan.'
  },
  {
    icon: 'analytics',
    title: 'Implementation Tracking',
    description: 'A record of what has been implemented and how your business has improved over time.'
  },
  {
    icon: 'growth-readiness',
    title: 'Quarterly Personalised Reviews',
    description: 'Free ongoing support: a personalised performance review each quarter, with fresh recommendations and progress tracking.'
  },
  {
    icon: 'edit',
    title: 'Profile Updates',
    description: 'Your profile is updated after a reassessment or a completed project, so it always reflects where the business actually is.'
  },
  {
    icon: 'notification',
    title: 'Program Updates',
    description: 'Updates about the initiative delivered to your profile.'
  }
]

export function WhatYouReceive() {
  return (
    <section className="section bg-[var(--bg-section)]">
      <div className="container-custom">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            <SvgIcon name="growth-profile" size={16} />
            What You Receive
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-heading"
          >
            Everything You Need To Understand Your Growth Readiness
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="section-description mx-auto"
          >
            Complete the assessment and receive a comprehensive growth profile
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-12">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover:border-[var(--accent-orange)] hover:shadow-lg hover:shadow-[var(--accent-orange)]/5"
            >
              <div className="mb-4">
                <div className="inline-flex rounded-xl bg-[var(--accent-orange)]/10 p-3">
                  <SvgIcon name={benefit.icon} size={28} color="var(--accent-orange)" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">{benefit.title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{benefit.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Free vs paid, stated plainly rather than left to inference. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-8 grid gap-4 md:grid-cols-2"
        >
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--accent-orange)]">
              Free
            </h3>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Your Growth Profile, our reviewed findings and priorities, your
              recommended action plan, progress tracking, and quarterly personalised
              performance reviews. These stay free for life once you are approved,
              even if you never take on a paid project.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Paid
            </h3>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Implementation — the work of actually building and changing things —
              is paid. Qualified merchants receive 25% coverage of Hbee Digitals&apos;
              implementation fees and pay the remaining 75%. See the terms below.
            </p>
          </div>
        </motion.div>

        {/* Explicitly future-tense, so nothing unbuilt reads as an available
            benefit. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-6"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              <SvgIcon name="clock" size={18} color="var(--text-muted)" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                In development — not available today
              </h3>
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                Connected live store metrics and loyalty features are being built.
                They are not part of what you receive today, and nothing in the
                initiative depends on them.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}