'use client'

import { useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

export interface AccordionItem {
  id: string
  title: ReactNode
  content: ReactNode
}

interface AccordionProps {
  items: AccordionItem[]
  /** `single` closes others on open; `multiple` allows many open. */
  type?: 'single' | 'multiple'
  defaultOpenIds?: string[]
  tone?: 'default' | 'inverse'
  className?: string
}

/**
 * Accessible accordion — button headers with aria-expanded / aria-controls,
 * region panels with aria-labelledby, ArrowUp/Down/Home/End roving between
 * headers, height animation that collapses instantly under reduced-motion.
 * Powers FAQ / footer / mobile-nav later.
 */
export default function Accordion({
  items,
  type = 'single',
  defaultOpenIds = [],
  tone = 'default',
  className,
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds)
  const headerRefs = useRef<(HTMLButtonElement | null)[]>([])
  const reduce = useReducedMotion()
  const inverse = tone === 'inverse'

  const toggle = (id: string) => {
    setOpenIds((current) => {
      const isOpen = current.includes(id)
      if (type === 'single') return isOpen ? [] : [id]
      return isOpen ? current.filter((x) => x !== id) : [...current, id]
    })
  }

  const onHeaderKeyDown = (e: React.KeyboardEvent, index: number) => {
    const count = items.length
    let next = -1
    if (e.key === 'ArrowDown') next = (index + 1) % count
    else if (e.key === 'ArrowUp') next = (index - 1 + count) % count
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = count - 1
    if (next >= 0) {
      e.preventDefault()
      headerRefs.current[next]?.focus()
    }
  }

  return (
    <div className={cn('divide-y', inverse ? 'divide-white/10' : 'divide-[var(--border)]', className)}>
      {items.map((item, index) => {
        const isOpen = openIds.includes(item.id)
        const btnId = `acc-h-${item.id}`
        const panelId = `acc-p-${item.id}`
        return (
          <div key={item.id}>
            <h3 className="m-0">
              <button
                ref={(el) => {
                  headerRefs.current[index] = el
                }}
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                onKeyDown={(e) => onHeaderKeyDown(e, index)}
                className={cn(
                  'flex w-full items-center justify-between gap-4 py-4 text-left',
                  'text-[length:var(--fs-h4)] font-semibold leading-[var(--lh-h4)]',
                  inverse ? 'text-[var(--text-on-inverse)]' : 'text-[var(--text)]',
                  'transition-colors duration-[var(--dur-hover)] hover:text-[var(--accent)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
                  inverse ? 'focus-visible:ring-offset-[var(--bg-inverse)]' : 'focus-visible:ring-offset-[var(--bg)]',
                )}
              >
                <span>{item.title}</span>
                <svg
                  viewBox="0 0 20 20"
                  className={cn('h-4 w-4 shrink-0 transition-transform duration-[var(--dur-hover)]', isOpen && 'rotate-180')}
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="panel"
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={reduce ? { height: 0, opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div
                    className={cn(
                      'pb-5 pr-8 text-[length:var(--fs-body)] leading-[var(--lh-body)]',
                      inverse ? 'text-[var(--text-on-dark-muted)]' : 'text-[var(--text-secondary)]',
                    )}
                  >
                    {item.content}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
