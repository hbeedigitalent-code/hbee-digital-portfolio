// src/components/growth-readiness/FinalCTA.tsx

'use client'

import SvgIcon from '@/components/ui/SvgIcon'
import Link from 'next/link'
import { motion } from 'framer-motion'

export function FinalCTA() {
  return (
    <section className="section relative overflow-hidden bg-[var(--bg-section)]">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-orange)] via-transparent to-[var(--accent-lime)]" />
      </div>
      
      <div className="container-custom relative">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            <SvgIcon name="growth-readiness" size={16} />
            Ready To Discover Your Growth Readiness?
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-heading"
          >
            Start Your Assessment Before September Ends
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="section-description mx-auto"
          >
            Complete the assessment and we will review your business, identify your
            priorities, and recommend a growth action plan.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link
              href="/assessment"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-orange)] px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-[var(--orange-600)] hover:scale-[1.03] hover:shadow-lg hover:shadow-[var(--accent-orange)]/25"
            >
              Start Your Assessment
              <SvgIcon name="arrow-right" size={18} color="white" className="transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}