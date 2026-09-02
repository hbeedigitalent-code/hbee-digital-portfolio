'use client'

import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
  children: ReactNode
}

/**
 * Native <select> styled to match Input. Native is deliberate — accessible,
 * mobile-friendly, no JS. Use <Dropdown> for menu/actions, not for form values.
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid = false, className, children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'w-full h-11 appearance-none rounded-[var(--radius-control)] border bg-[var(--surface)] pl-3.5 pr-10',
          'text-[length:var(--fs-body)] text-[var(--text)]',
          'transition-[border-color,box-shadow] duration-[var(--dur-hover)] ease-[var(--ease-standard)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
          'disabled:cursor-not-allowed disabled:opacity-60',
          invalid
            ? 'border-[var(--error)] focus-visible:ring-[var(--error)]'
            : 'border-[var(--border)] focus-visible:border-[var(--accent)]',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
})

export default Select
