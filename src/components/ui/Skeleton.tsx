import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'

interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle'
  width?: number | string
  height?: number | string
  /** Number of stacked lines for the `text` variant. */
  lines?: number
  className?: string
  style?: CSSProperties
}

/**
 * Canonical loading placeholder. Uses surface/border tokens, a gentle pulse
 * that stops under prefers-reduced-motion. No shimmer, no rainbow.
 */
export default function Skeleton({
  variant = 'rect',
  width,
  height,
  lines = 1,
  className,
  style,
}: SkeletonProps) {
  const base =
    'animate-pulse bg-[var(--bg-subtle)] border border-[var(--border)] motion-reduce:animate-none'

  if (variant === 'text') {
    return (
      <span className={cn('flex flex-col gap-2', className)} aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            className={cn(base, 'block h-[0.9em] rounded-[6px]')}
            style={{ width: i === lines - 1 && lines > 1 ? '70%' : width ?? '100%' }}
          />
        ))}
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn(base, variant === 'circle' ? 'block rounded-full' : 'block rounded-[var(--radius-control)]', className)}
      style={{ width: width ?? (variant === 'circle' ? 40 : '100%'), height: height ?? (variant === 'circle' ? 40 : 20), ...style }}
    />
  )
}
