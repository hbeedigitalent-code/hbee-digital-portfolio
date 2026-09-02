'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface RevealProps {
  children: ReactNode
  /** Delay in seconds before the reveal starts. */
  delay?: number
  /** Vertical travel distance in px. */
  y?: number
  className?: string
}

/**
 * Canonical scroll-reveal wrapper for the marketing primitives.
 * Opacity + small Y translate, fires once, honours prefers-reduced-motion.
 * Uses the Phase 02 motion easing (--ease-standard).
 */
export default function Reveal({ children, delay = 0, y = 16, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const reduce = useReducedMotion()

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  )
}
