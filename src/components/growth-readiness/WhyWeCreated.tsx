// src/components/growth-readiness/WhyWeCreated.tsx

'use client'

import SvgIcon from '@/components/ui/SvgIcon'
import { motion } from 'framer-motion'

export function WhyWeCreated() {
  return (
    <section className="section bg-[var(--bg-section)]">
      <div className="container-custom">
        <div className="mx-auto max-w-4xl">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            <SvgIcon name="about" size={16} />
            Why We Created This Initiative
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-heading"
          >
            Getting Ready For Q4 Starts In September
          </motion.h2>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4 text-lg text-[var(--text-secondary)]"
          >
            <p>
              Most store owners know they want to grow. Far fewer know which part of
              the business is actually holding them back — and Q4 is the wrong time
              to find out.
            </p>
            <p>
              The <span className="font-semibold text-[var(--text-primary)]">Q3/Q4 Growth Support Initiative</span> exists
              to use September differently. You complete the Hbee Growth Readiness
              Assessment, we review your business against it, and you get a clear
              picture of your priorities and a recommended growth action plan before
              the busiest quarter of the year.
            </p>
            <p>
              Approved merchants keep a{' '}
              <span className="font-semibold text-[var(--text-primary)]">free lifetime Growth Profile</span>, whether or
              not they go ahead with a paid project. Recommendations, progress
              tracking and quarterly personalised reviews stay free. Only
              implementation is paid.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-md)]"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-[var(--text-secondary)]">
              <span className="flex items-center gap-2">
                <div className="rounded-full bg-[var(--accent-orange)]/15 p-1">
                  <SvgIcon name="check" size={14} color="var(--accent-orange)" />
                </div>
                Hbee-reviewed findings
              </span>
              <span className="flex items-center gap-2">
                <div className="rounded-full bg-[var(--accent-orange)]/15 p-1">
                  <SvgIcon name="check" size={14} color="var(--accent-orange)" />
                </div>
                5 growth pillars
              </span>
              <span className="flex items-center gap-2">
                <div className="rounded-full bg-[var(--accent-orange)]/15 p-1">
                  <SvgIcon name="check" size={14} color="var(--accent-orange)" />
                </div>
                Prioritised action plan
              </span>
              <span className="flex items-center gap-2">
                <div className="rounded-full bg-[var(--accent-orange)]/15 p-1">
                  <SvgIcon name="check" size={14} color="var(--accent-orange)" />
                </div>
                Free quarterly reviews
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}