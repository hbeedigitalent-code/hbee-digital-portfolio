'use client'

import { useEffect, useState } from 'react'

/**
 * Thin scroll-linked progress bar for article pages. Purely decorative:
 * `aria-hidden`, no focusable target, `pointer-events-none`, and no animation
 * (it tracks the scroll position directly, so `prefers-reduced-motion` needs no
 * special handling). Fixed position — it never shifts page layout.
 */
export default function BlogReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      const el = document.documentElement
      const scrollable = el.scrollHeight - el.clientHeight
      setProgress(scrollable > 0 ? Math.min(1, Math.max(0, el.scrollTop / scrollable)) : 0)
    }

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] bg-transparent"
    >
      <div
        className="h-full bg-[var(--accent)] transition-[width] duration-150 ease-out motion-reduce:transition-none"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  )
}
