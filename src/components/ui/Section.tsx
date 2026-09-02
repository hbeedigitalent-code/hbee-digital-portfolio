import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import Container from './Container'
import Reveal from './Reveal'

interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  /** Surface the section sits on. */
  background?: 'default' | 'subtle' | 'inverse'
  /** Vertical rhythm — uses the Phase 02 --space-section tokens. */
  spacing?: 'default' | 'compact' | 'none'
  /** Wrap children in a <Container>. Set false for full-bleed content. */
  container?: boolean | 'wide'
  /** Fade + rise the content in on scroll (honours reduced-motion). */
  reveal?: boolean
  as?: ElementType
  className?: string
}

const BACKGROUND: Record<NonNullable<SectionProps['background']>, string> = {
  default: 'bg-[var(--bg)] text-[var(--text)]',
  subtle: 'bg-[var(--bg-subtle)] text-[var(--text)]',
  inverse: 'bg-[var(--bg-inverse)] text-[var(--text-on-inverse)]',
}

const SPACING: Record<NonNullable<SectionProps['spacing']>, string> = {
  default: 'py-[var(--space-section)]',
  compact: 'py-[var(--space-section-compact)]',
  none: 'py-0',
}

/**
 * Canonical page section. Owns background + vertical rhythm so individual
 * sections stop inventing their own `py-16 / py-20 / py-24` values.
 */
export default function Section({
  children,
  background = 'default',
  spacing = 'default',
  container = true,
  reveal = false,
  as,
  className,
  ...rest
}: SectionProps) {
  const Tag = as ?? 'section'

  const inner = container ? (
    <Container size={container === 'wide' ? 'wide' : 'default'}>{children}</Container>
  ) : (
    children
  )

  return (
    <Tag className={cn('relative', BACKGROUND[background], SPACING[spacing], className)} {...rest}>
      {reveal ? <Reveal>{inner}</Reveal> : inner}
    </Tag>
  )
}
