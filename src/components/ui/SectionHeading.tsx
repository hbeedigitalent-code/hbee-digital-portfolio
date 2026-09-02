import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import Reveal from './Reveal'

interface SectionHeadingProps {
  /** Small uppercase kicker above the title. One canonical treatment. */
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** Heading level for the title element. Visual size is fixed by `size`. */
  as?: 'h1' | 'h2' | 'h3'
  /** Visual size of the title. */
  size?: 'display' | 'h1' | 'h2' | 'h3'
  align?: 'left' | 'center'
  tone?: 'default' | 'inverse'
  reveal?: boolean
  className?: string
  /** Optional slot rendered under the description (e.g. a CTA row). */
  children?: ReactNode
}

const TITLE_SIZE: Record<NonNullable<SectionHeadingProps['size']>, string> = {
  display: 'text-[length:var(--fs-display)] leading-[var(--lh-display)] tracking-[var(--ls-display)] font-bold',
  h1: 'text-[length:var(--fs-h1)] leading-[var(--lh-h1)] tracking-[var(--ls-h1)] font-bold',
  h2: 'text-[length:var(--fs-h2)] leading-[var(--lh-h2)] tracking-[var(--ls-h2)] font-semibold',
  h3: 'text-[length:var(--fs-h3)] leading-[var(--lh-h3)] tracking-[var(--ls-h3)] font-semibold',
}

/**
 * Canonical section heading — absorbs the roles of the old SectionHeading,
 * SectionLabel, AnimatedHeading and the .heading-* utility classes.
 *
 * Exactly one eyebrow treatment: 12px / 600 / 0.12em / uppercase, accent tint.
 */
export default function SectionHeading({
  eyebrow,
  title,
  description,
  as = 'h2',
  size = 'h2',
  align = 'left',
  tone = 'default',
  reveal = false,
  className,
  children,
}: SectionHeadingProps) {
  const Title = as
  const inverse = tone === 'inverse'

  const content = (
    <div
      className={cn(
        'flex flex-col',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow ? (
        <span
          className={cn(
            'mb-3 inline-flex items-center text-[length:var(--fs-eyebrow)] font-semibold uppercase leading-none tracking-[var(--ls-eyebrow)]',
            inverse ? 'text-[var(--accent-hover)]' : 'text-[var(--accent)]',
          )}
        >
          {eyebrow}
        </span>
      ) : null}

      <Title
        className={cn(
          TITLE_SIZE[size],
          inverse ? 'text-[var(--text-on-inverse)]' : 'text-[var(--text)]',
        )}
      >
        {title}
      </Title>

      {description ? (
        <p
          className={cn(
            'mt-4 max-w-[68ch] text-[length:var(--fs-body-lg)] leading-[var(--lh-body-lg)]',
            inverse ? 'text-[var(--text-on-dark-muted)]' : 'text-[var(--text-secondary)]',
          )}
        >
          {description}
        </p>
      ) : null}

      {children ? <div className={cn('mt-6', align === 'center' && 'flex justify-center')}>{children}</div> : null}
    </div>
  )

  return reveal ? <Reveal>{content}</Reveal> : content
}
