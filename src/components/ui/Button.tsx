'use client'

import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'cta' | 'outline-dark'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
  children: ReactNode
  href?: string
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  /** For href links that should open in a new tab, etc. */
  target?: string
  rel?: string
}

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] ' +
  'text-[length:var(--fs-button)] font-semibold tracking-[var(--ls-button)] leading-none ' +
  'transition-[background-color,border-color,color,opacity] duration-[var(--dur-hover)] ease-[var(--ease-standard)] ' +
  'active:scale-[0.985] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] ' +
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50'

const VARIANT: Record<ButtonVariant, string> = {
  // `primary` is a stable dark "ink" button — it does NOT invert with the
  // theme. This preserves the old .btn-primary behaviour that many existing
  // consumers rely on (e.g. hard-coded white icons inside primary buttons).
  primary: 'bg-[var(--bg-inverse)] text-[var(--text-on-inverse)] hover:bg-[var(--navy-800)]',
  secondary:
    'border border-[var(--border)] bg-transparent text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]',
  ghost: 'bg-transparent text-[var(--text)] hover:bg-[var(--bg-subtle)]',
  cta: 'bg-[var(--cta)] text-[var(--cta-text)] hover:bg-[var(--cta-hover)]',
  'outline-dark':
    'border border-white/25 bg-transparent text-white hover:bg-white hover:text-[var(--bg-inverse)]',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-4',
  md: 'h-11 px-6',
  lg: 'h-[52px] px-8 text-[1rem]',
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin motion-reduce:animate-none"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  )
}

/**
 * Canonical button primitive. No gradients. Semantic tokens only.
 * Backward compatible with the previous Button API (variant/size/icon/
 * iconPosition/href/onClick/disabled). `outline-dark` is kept for existing
 * dark-section call sites; `ghost` is the new light-surface equivalent.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    href,
    variant = 'primary',
    size = 'md',
    className,
    type = 'button',
    disabled = false,
    loading = false,
    fullWidth = false,
    icon,
    iconPosition = 'right',
    target,
    rel,
    ...rest
  },
  ref,
) {
  const classes = cn(BASE, VARIANT[variant], SIZE[size], fullWidth && 'w-full', className)

  const inner = (
    <>
      {loading ? <Spinner /> : icon && iconPosition === 'left' ? <span className="shrink-0">{icon}</span> : null}
      {/* inline-flex + gap so an icon passed *inside* children (a very common
          pattern in existing consumers) gets consistent spacing */}
      <span className="inline-flex items-center gap-1.5">{children}</span>
      {!loading && icon && iconPosition === 'right' ? <span className="shrink-0">{icon}</span> : null}
    </>
  )

  if (href && !disabled && !loading) {
    return (
      <Link
        href={href}
        target={target}
        rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
        className={classes}
      >
        {inner}
      </Link>
    )
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {inner}
    </button>
  )
})

export default Button
export type { ButtonProps, ButtonVariant, ButtonSize }
