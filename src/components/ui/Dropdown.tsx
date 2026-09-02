'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface DropdownProps {
  /** The trigger element's contents (rendered inside a <button>). */
  label: ReactNode
  children: ReactNode
  align?: 'start' | 'end'
  /** Extra class for the trigger button. */
  triggerClassName?: string
  /** Extra class for the menu panel. */
  menuClassName?: string
  className?: string
}

interface DropdownItemProps {
  children: ReactNode
  href?: string
  onSelect?: () => void
  disabled?: boolean
  className?: string
}

/**
 * Accessible menu: aria-haspopup / aria-expanded, roving focus with
 * Arrow/Home/End, Escape + outside-click + route-change close.
 * Compact by design. Powers nav menus / profile menus later.
 */
export function Dropdown({
  label,
  children,
  align = 'start',
  triggerClassName,
  menuClassName,
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const pathname = usePathname()
  const firstOpen = useRef(true)

  // Close on route change (skip the initial mount).
  useEffect(() => {
    if (firstOpen.current) {
      firstOpen.current = false
      return
    }
    setOpen(false)
  }, [pathname])

  // Outside click / focus.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer, true)
    return () => document.removeEventListener('pointerdown', onPointer, true)
  }, [open])

  const items = useCallback(
    () =>
      menuRef.current
        ? Array.from(menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])'))
        : [],
    [],
  )

  const focusItem = useCallback(
    (index: number) => {
      const list = items()
      if (list.length === 0) return
      const next = (index + list.length) % list.length
      list[next]?.focus()
    },
    [items],
  )

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => focusItem(0), 0)
      return () => window.clearTimeout(t)
    }
  }, [open, focusItem])

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const list = items()
    const currentIndex = list.indexOf(document.activeElement as HTMLElement)
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        focusItem(currentIndex + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        focusItem(currentIndex - 1)
        break
      case 'Home':
        e.preventDefault()
        focusItem(0)
        break
      case 'End':
        e.preventDefault()
        focusItem(list.length - 1)
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div ref={rootRef} className={cn('relative inline-block', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-[var(--radius-control)] text-[length:var(--fs-nav)] font-medium text-[var(--text)]',
          'transition-colors duration-[var(--dur-hover)] hover:text-[var(--accent)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
          triggerClassName,
        )}
      >
        {label}
        <svg
          viewBox="0 0 20 20"
          className={cn('h-3.5 w-3.5 transition-transform duration-[var(--dur-hover)]', open && 'rotate-180')}
          fill="none"
          aria-hidden="true"
        >
          <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            onKeyDown={onMenuKeyDown}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'absolute z-50 mt-2 min-w-[12rem] overflow-hidden rounded-[var(--radius-control)]',
              'border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-md)]',
              align === 'end' ? 'right-0' : 'left-0',
              menuClassName,
            )}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export function DropdownItem({ children, href, onSelect, disabled = false, className }: DropdownItemProps) {
  const classes = cn(
    'flex w-full items-center gap-2 rounded-[calc(var(--radius-control)-2px)] px-3 py-2 text-left',
    'text-[length:var(--fs-body-sm)] text-[var(--text)]',
    'transition-colors duration-[var(--dur-hover)] hover:bg-[var(--bg-subtle)]',
    'focus:bg-[var(--bg-subtle)] focus:outline-none',
    disabled && 'pointer-events-none opacity-50',
    className,
  )

  if (href && !disabled) {
    return (
      <Link href={href} role="menuitem" tabIndex={-1} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      onClick={onSelect}
      className={classes}
    >
      {children}
    </button>
  )
}

export default Dropdown
