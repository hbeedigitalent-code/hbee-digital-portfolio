'use client'

import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid = false, className, rows = 4, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full min-h-[120px] rounded-[var(--radius-control)] border bg-[var(--surface)] px-3.5 py-2.5',
        'text-[length:var(--fs-body)] leading-[var(--lh-body)] text-[var(--text)] placeholder:text-[var(--text-muted)]',
        'transition-[border-color,box-shadow] duration-[var(--dur-hover)] ease-[var(--ease-standard)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        invalid
          ? 'border-[var(--error)] focus-visible:ring-[var(--error)]'
          : 'border-[var(--border)] focus-visible:border-[var(--accent)]',
        className,
      )}
      {...rest}
    />
  )
})

export default Textarea
