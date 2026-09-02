'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Close when the backdrop is clicked. Default true. */
  closeOnOverlayClick?: boolean
  /** Element to focus when the modal opens. Defaults to the first focusable. */
  initialFocusRef?: RefObject<HTMLElement>
  className?: string
}

const SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  initialFocusRef,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const reduce = useReducedMotion()
  const baseId = useId()
  const titleId = `${baseId}-title`
  const descId = `${baseId}-desc`

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return

      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null)
      if (nodes.length === 0) {
        e.preventDefault()
        panelRef.current.focus()
        return
      }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement as HTMLElement | null

      // If focus somehow escaped the dialog, pull it back in.
      if (active && !panelRef.current.contains(active)) {
        e.preventDefault()
        first.focus()
        return
      }

      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return

    restoreFocusRef.current = document.activeElement as HTMLElement | null

    const { body } = document
    const prevOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    document.addEventListener('keydown', handleKeyDown, true)

    const focusTimer = window.setTimeout(() => {
      const target =
        initialFocusRef?.current ??
        panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
        panelRef.current
      target?.focus()
    }, 0)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown, true)
      body.style.overflow = prevOverflow
      restoreFocusRef.current?.focus?.()
    }
  }, [open, handleKeyDown, initialFocusRef])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="modal-root"
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={false}
          animate={{}}
          exit={{}}
        >
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={closeOnOverlayClick ? onClose : undefined}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.15 }}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={cn(
              'relative w-full rounded-t-[var(--radius-large)] sm:rounded-[var(--radius-large)]',
              'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-lg)]',
              'max-h-[90vh] overflow-y-auto p-6 outline-none',
              SIZE[size],
              className,
            )}
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-[var(--radius-control)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>

            {title ? (
              <h2 id={titleId} className="pr-8 text-[length:var(--fs-h3)] font-semibold leading-[var(--lh-h3)]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p id={descId} className="mt-1.5 text-[length:var(--fs-body-sm)] text-[var(--text-secondary)]">
                {description}
              </p>
            ) : null}

            <div className={cn(title || description ? 'mt-4' : '')}>{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
