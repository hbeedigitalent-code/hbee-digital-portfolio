'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visual error state (usually driven by <Field>). */
  invalid?: boolean
}

export const inputBaseClass =
  'w-full h-11 rounded-[var(--radius-control)] border bg-[var(--surface)] px-3.5 ' +
  'text-[length:var(--fs-body)] text-[var(--text)] placeholder:text-[var(--text-muted)] ' +
  'transition-[border-color,box-shadow] duration-[var(--dur-hover)] ease-[var(--ease-standard)] ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-0 ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        inputBaseClass,
        invalid
          ? 'border-[var(--error)] focus-visible:ring-[var(--error)]'
          : 'border-[var(--border)] focus-visible:border-[var(--accent)]',
        className,
      )}
      {...rest}
    />
  )
})

export default Input
