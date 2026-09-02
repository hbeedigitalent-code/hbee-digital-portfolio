'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface StatItem {
  value: string
  label: string
  icon?: string
  description?: string
}

interface StatsBarProps {
  stats?: StatItem[]
}

const defaultStats: StatItem[] = [
  { value: '87', label: 'Projects Completed', description: 'Successful digital systems delivered.', icon: 'portfolio' },
  { value: '45', label: 'Happy Clients', description: 'Trusted partners across ecommerce.', icon: 'star' },
  { value: '5', label: 'Years Experience', description: 'Years of expertise in digital growth.', icon: 'growth' },
  { value: '98', label: 'Client Satisfaction', description: 'Focused on measurable client success.', icon: 'analytics' },
]

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!isInView || reduce) {
      setCount(target)
      return
    }
    let raf = 0
    const duration = 1400
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      // ease-out
      setCount(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isInView, target, reduce])

  return (
    <span ref={ref} className="tabular-nums">
      {count}
      {suffix}
    </span>
  )
}

export default function StatsBar({ stats = defaultStats }: StatsBarProps) {
  const reduce = useReducedMotion()

  const parse = (value: string) => {
    const num = parseInt(value.replace(/[^0-9]/g, ''), 10)
    return { num: isNaN(num) ? 0 : num, suffix: /%/.test(value) ? '%' : '+' }
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
      {stats.map((stat, i) => {
        const { num, suffix } = parse(stat.value)
        return (
          <motion.div
            key={stat.label}
            initial={reduce ? undefined : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: Math.min(i * 0.07, 0.28) }}
            className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors duration-[var(--dur-hover)] hover:border-[var(--accent)]/40 sm:p-6"
          >
            <SvgIcon name={stat.icon || 'verified'} size={18} color="var(--accent)" />

            <p className="mt-3 text-[length:var(--fs-h2)] font-bold leading-none tracking-[var(--ls-h1)] text-[var(--text)] sm:text-[length:var(--fs-h1)]">
              <Counter target={num} suffix={suffix} />
            </p>

            <p className="mt-2 text-[length:var(--fs-body-sm)] font-semibold text-[var(--text)]">
              {stat.label}
            </p>

            {stat.description ? (
              <p className="mt-1 text-[length:var(--fs-caption)] leading-snug text-[var(--text-muted)]">
                {stat.description}
              </p>
            ) : null}
          </motion.div>
        )
      })}
    </div>
  )
}
