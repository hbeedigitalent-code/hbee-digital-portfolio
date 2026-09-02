import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  /**
   * default     — surface + hairline border + xs shadow
   * interactive — same, with a subtle hover (border + 1px lift). Use with href.
   * flat        — surface + border, no shadow, no hover
   */
  variant?: 'default' | 'interactive' | 'flat'
  /** Render the whole card as a link. */
  href?: string
  as?: ElementType
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
}

const PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

const VARIANT: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]',
  flat: 'border border-[var(--border)] bg-[var(--surface)]',
  interactive:
    'border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] ' +
    'transition-[transform,border-color,box-shadow] duration-[var(--dur-hover)] ease-[var(--ease-standard)] ' +
    'hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] ' +
    'motion-reduce:transition-none motion-reduce:hover:translate-y-0 ' +
    'focus-within:ring-2 focus-within:ring-[var(--ring)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--bg)]',
}

/**
 * Canonical surface primitive. One radius (--radius-card), hairline border,
 * subtle elevation. No scaling, no oversized shadows.
 */
export default function Card({
  children,
  variant = 'default',
  href,
  as,
  padding = 'md',
  className,
  ...rest
}: CardProps) {
  const classes = cn(
    'block rounded-[var(--radius-card)]',
    VARIANT[variant],
    PADDING[padding],
    className,
  )

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  const Tag = as ?? 'div'
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}
