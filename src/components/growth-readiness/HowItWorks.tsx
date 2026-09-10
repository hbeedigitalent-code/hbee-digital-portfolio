// src/components/growth-readiness/HowItWorks.tsx

'use client'

import SvgIcon from '@/components/ui/SvgIcon'
import { motion } from 'framer-motion'

// No completion-time estimate appears here. None has been measured, and the
// previous "5–7 minutes" claim was not supported.
const steps = [
  {
    number: '01',
    title: 'Complete The Assessment',
    description: 'Seven short sections about your business, your goals and where you are stuck.',
    icon: 'edit'
  },
  {
    number: '02',
    title: 'We Review Your Business',
    description: 'Hbee Digitals reviews your responses and your store, then identifies your priorities.',
    icon: 'search'
  },
  {
    number: '03',
    title: 'You Receive A Decision',
    description: 'We email you the outcome. Approved merchants get instructions to access their free Growth Profile.',
    icon: 'email'
  },
  {
    number: '04',
    title: 'Choose Your Next Step',
    description: 'Keep the profile and the free quarterly reviews, or agree a scope for paid implementation.',
    icon: 'strategy'
  }
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section bg-[var(--bg-page)]">
      <div className="container-custom">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            <SvgIcon name="strategy" size={16} />
            How It Works
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-heading"
          >
            Simple 4-Step Process
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="section-description mx-auto"
          >
            From assessment to a reviewed growth action plan
          </motion.p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center transition-all hover:border-[var(--accent-orange)] hover:shadow-lg hover:shadow-[var(--accent-orange)]/5">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-xl bg-[var(--accent-orange)]/10 p-3">
                    <SvgIcon name={step.icon} size={32} color="var(--accent-orange)" />
                  </div>
                </div>
                <div className="mb-2 text-sm font-bold text-[var(--accent-orange)]">
                  {step.number}
                </div>
                <h3 className="mb-2 font-semibold text-[var(--text-primary)]">{step.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{step.description}</p>
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block">
                  <div 
                    className="absolute right-0 top-1/2 h-0.5 w-8 -translate-y-1/2 bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)]" 
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Cost and timing terms. Kept together and stated in plain numbers so a
            merchant can work out their own share without contacting us. */}
        <div className="mx-auto mt-12 max-w-3xl space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              If you go ahead with implementation
            </h3>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Qualified merchants receive{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                25% coverage of Hbee Digitals&apos; implementation fees
              </span>
              . You cover the remaining 75%.
            </p>

            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Illustration
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Eligible Hbee fees</p>
                  <p className="mt-0.5 text-lg font-bold text-[var(--text-primary)]">$1,000</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Covered by Hbee (25%)</p>
                  <p className="mt-0.5 text-lg font-bold text-[var(--accent-orange)]">$250</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Your share (75%)</p>
                  <p className="mt-0.5 text-lg font-bold text-[var(--text-primary)]">$750</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                This is an illustration of how the split works. It is not a package
                price and not an initial payment amount — your actual figures depend
                on the scope you agree.
              </p>
            </div>

            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Coverage applies to Hbee Digitals&apos; implementation fees only.{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                Third-party costs are excluded
              </span>{' '}
              — for example apps, themes, hosting, advertising spend, and any other
              service billed to you by someone other than Hbee Digitals.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-[var(--accent-orange)]/30 bg-[var(--accent-orange)]/5 p-6"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                <SvgIcon name="calendar" size={20} color="var(--accent-orange)" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  The September condition
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  For a project to be eligible, its scope must be agreed and the
                  required initial payment made{' '}
                  <span className="font-semibold text-[var(--text-primary)]">during September</span>
                  . Delivery does not have to finish in September — work can continue
                  into October.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}