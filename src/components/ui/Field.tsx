'use client'

import {
  useId,
  cloneElement,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from 'react'
import { cn } from '@/lib/cn'

interface FieldProps {
  label: ReactNode
  /** Helper text shown under the control when there is no error. */
  hint?: ReactNode
  /** Error message. When set, the control gets aria-invalid + error styling. */
  error?: ReactNode
  required?: boolean
  /** Visually hide the label (still announced to screen readers). */
  hideLabel?: boolean
  className?: string
  children: ReactNode
}

/**
 * Wraps a form control with label / hint / error and wires up
 * id / aria-describedby / aria-invalid / required automatically when the
 * child is a single React element (e.g. <Input>, <Textarea>, <Select>).
 */
export default function Field({
  label,
  hint,
  error,
  required = false,
  hideLabel = false,
  className,
  children,
}: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && !error ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ') || undefined

  let control: ReactNode = children
  if (isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown>>
    control = cloneElement(child, {
      id: (child.props.id as string | undefined) ?? id,
      'aria-describedby': (child.props['aria-describedby'] as string | undefined) ?? describedBy,
      'aria-invalid': error ? true : child.props['aria-invalid'],
      'aria-required': required || (child.props['aria-required'] as boolean | undefined),
      required: (child.props.required as boolean | undefined) ?? required,
      invalid: error ? true : child.props.invalid,
    })
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className={cn(
          'text-[length:var(--fs-body-sm)] font-medium text-[var(--text)]',
          hideLabel && 'sr-only',
        )}
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-[var(--error)]" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {control}

      {error ? (
        <p id={errorId} className="text-[length:var(--fs-caption)] text-[var(--error)]">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[length:var(--fs-caption)] text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
