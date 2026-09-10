// src/components/growth-readiness/WhoItsFor.tsx

'use client'

import SvgIcon from '@/components/ui/SvgIcon'
import { motion } from 'framer-motion'

const audiences = [
  {
    icon: 'ecommerce',
    title: 'Ecommerce Brands',
    description: 'Online retailers looking to scale their operations'
  },
  {
    icon: 'shopify',
    title: 'Shopify Store Owners',
    description: 'Merchants using Shopify as their ecommerce platform'
  },
  {
    icon: 'woocommerce',
    title: 'WooCommerce Stores',
    description: 'Businesses using WordPress and WooCommerce'
  },
  {
    icon: 'digital-marketing',
    title: 'Digital Product Businesses',
    description: 'Companies offering digital products and services'
  },
  {
    icon: 'growth',
    title: 'Growth-Focused Founders',
    description: 'Entrepreneurs ready to take their business to the next level'
  }
]

export function WhoItsFor() {
  return (
    <section className="section bg-[var(--bg-page)]">
      <div className="container-custom">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            <SvgIcon name="users" size={16} />
            Who It Is For
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-heading"
          >
            Who Qualifies
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="section-description mx-auto"
          >
            Anyone can complete the assessment. Approval is decided by us, based on
            what we see in your submission and your store.
          </motion.p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((audience, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover:border-[var(--accent-orange)]"
            >
              <div className="flex-shrink-0">
                <div className="rounded-xl bg-[var(--accent-orange)]/10 p-2.5">
                  <SvgIcon name={audience.icon} size={24} color="var(--accent-orange)" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{audience.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{audience.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* What we actually weigh when deciding. Stated so a merchant can judge
            their own fit before submitting, rather than guessing. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-8 max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
        >
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            What we consider
          </h3>
          <ul className="mt-4 space-y-3">
            {[
              'You are running an active ecommerce business.',
              'There are improvement needs we can identify.',
              'You have clear goals for the business.',
              'You are ready to provide the information, assets and approvals the work needs.',
              'We can realistically help you.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                <div className="mt-0.5 flex-shrink-0 rounded-full bg-[var(--accent-orange)]/15 p-1">
                  <SvgIcon name="check" size={12} color="var(--accent-orange)" />
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-[var(--border)] pt-4 text-sm text-[var(--text-secondary)]">
            If you want to go ahead with paid implementation, you also need to be
            able to cover your 75% share. This does not affect approval for the free
            Growth Profile.
          </p>
        </motion.div>
      </div>
    </section>
  )
}