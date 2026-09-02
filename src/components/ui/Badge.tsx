import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'error'
  /** `pill` is fully rounded; `tag` uses the control radius. */
  shape?: 'pill' | 'tag'
  size?: 'sm' | 'md'
  icon?: ReactNode
  className?: string
}

const TONE: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]',
  accent: 'border border-transparent bg-[var(--accent-subtle)] text-[var(--accent)]',
  success: 'border border-transparent bg-[var(--success-subtle)] text-[var(--success)]',
  warning: 'border border-transparent bg-[var(--warning-subtle)] text-[var(--warning)]',
  error: 'border border-transparent bg-[var(--error-subtle)] text-[var(--error)]',
}

const SIZE: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'h-5 px-2 text-[11px] gap-1',
  md: 'h-6 px-2.5 text-[length:var(--fs-caption)] gap-1.5',
}

/**
 * Canonical badge / pill. One implementation, five semantic tones.
 */
export default function Badge({
  children,
  tone = 'neutral',
  shape = 'pill',
  size = 'md',
  icon,
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold leading-none',
        shape === 'pill' ? 'rounded-full' : 'rounded-[var(--radius-control)]',
        SIZE[size],
        TONE[tone],
        className,
      )}
      {...rest}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
    </span>
  )
}
