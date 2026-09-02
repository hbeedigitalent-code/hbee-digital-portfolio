import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  /** `default` = 1200px, `wide` = 1320px. */
  size?: 'default' | 'wide'
  /** Render as a different element (e.g. "header", "main"). Defaults to div. */
  as?: ElementType
  className?: string
}

/**
 * Canonical horizontal layout wrapper.
 *
 * Max width + responsive gutters come from the Phase 02 layout tokens:
 *   --container (1200px) / --container-wide (1320px)
 *   --gutter-mobile (20px) / --gutter-tablet (32px) / --gutter-desktop (48px)
 */
export default function Container({
  children,
  size = 'default',
  as,
  className,
  ...rest
}: ContainerProps) {
  const Tag = as ?? 'div'

  return (
    <Tag
      className={cn(
        'mx-auto w-full',
        'px-[var(--gutter-mobile)] md:px-[var(--gutter-tablet)] lg:px-[var(--gutter-desktop)]',
        size === 'wide' ? 'max-w-[var(--container-wide)]' : 'max-w-[var(--container)]',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
