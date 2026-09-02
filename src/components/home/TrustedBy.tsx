'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface Brand {
  name: string
  logo: string
}

function parseBrands(raw: unknown): Brand[] {
  let arr: unknown = raw
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(arr)) return []
  return arr
    .map((x) => {
      const item = (x || {}) as Record<string, unknown>
      return {
        name: typeof item.name === 'string' ? item.name : '',
        logo: typeof item.logo === 'string' ? item.logo : '',
        active: item.active !== false,
      }
    })
    .filter((b) => b.active && b.logo)
    .map(({ name, logo }) => ({ name, logo }))
}

export default function TrustedBy() {
  const reduce = useReducedMotion()
  const [brands, setBrands] = useState<Brand[]>([])

  useEffect(() => {
    let mounted = true
    supabase
      .from('trust_section')
      .select('partner_logos')
      .single()
      .then(({ data }) => {
        if (mounted) setBrands(parseBrands(data?.partner_logos))
      })
    return () => {
      mounted = false
    }
  }, [])

  if (brands.length === 0) return null

  return (
    <section className="relative bg-[var(--bg-section)] px-5 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-[length:var(--fs-eyebrow)] font-semibold uppercase tracking-[var(--ls-eyebrow)] text-[var(--accent)]">
          We are trusted by
        </p>
        <h2 className="mt-3 text-[length:var(--fs-h2)] font-semibold leading-[var(--lh-h2)] tracking-[var(--ls-h2)] text-[var(--text)]">
          Brands that build with us
        </h2>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {brands.map((brand, i) => (
            <motion.div
              key={`${brand.name}-${i}`}
              initial={reduce ? undefined : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.3) }}
              className="flex h-24 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-5 transition-colors duration-[var(--dur-hover)] hover:border-[var(--accent)]/40"
            >
              <img
                src={brand.logo}
                alt={brand.name}
                loading="lazy"
                decoding="async"
                className="max-h-9 w-auto max-w-[150px] object-contain opacity-70 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0 dark:opacity-80 dark:brightness-0 dark:invert dark:grayscale-0 dark:hover:opacity-100"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
