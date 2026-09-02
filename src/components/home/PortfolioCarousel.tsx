'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import NextImage from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

export interface CarouselSlide {
  id: string
  title: string
  image: string
  /** destination — an external project URL when `external`, otherwise an internal path */
  href: string
  external: boolean
}

interface PortfolioCarouselProps {
  slides: CarouselSlide[]
  /** index of the admin-featured project to focus first */
  initialIndex?: number
}

/** shortest signed distance from `i` to `active` on a ring of length `n` */
function ringOffset(i: number, active: number, n: number) {
  let d = (((i - active) % n) + n) % n
  if (d > n / 2) d -= n
  return d
}

/** advance only after this long with no interaction, then one step, then wait again */
const IDLE_AUTOPLAY_MS = 60_000

export default function PortfolioCarousel({ slides, initialIndex = 0 }: PortfolioCarouselProps) {
  const reduce = useReducedMotion()
  const n = slides.length

  const [active, setActive] = useState(() => (initialIndex >= 0 && initialIndex < n ? initialIndex : 0))
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [paused, setPaused] = useState(false)
  const [nudge, setNudge] = useState(0) // bump resets the idle-autoplay timer

  const trackRef = useRef<HTMLDivElement>(null)
  const [m, setM] = useState({ centerW: 320, sideW: 288, step: 300 })

  const p = useRef({ id: -1, startX: 0, startY: 0, axis: '' as '' | 'x' | 'y' })
  const rafRef = useRef(0)
  const pendingDx = useRef(0)
  const wheelLock = useRef(0)

  const go = useCallback((dir: number) => setActive((a) => (((a + dir) % n) + n) % n), [n])
  const bump = useCallback(() => setNudge((x) => x + 1), [])

  // ---- responsive geometry: one 3-card composition at every width ----
  // side card = centre card × 0.9, placed a clean `gap` past the centre card's
  // edge (never overlapping). Centre-card width is solved so the side card peeks
  // by ~½ (desktop) / ~⅓ (tablet) / ~¼ (mobile) of its own width, then the stage
  // clips whatever runs past its edge.
  useEffect(() => {
    const compute = () => {
      const stageW = trackRef.current?.clientWidth ?? Math.min(window.innerWidth, 1180)
      const w = window.innerWidth
      const H = stageW / 2
      const desktop = w >= 1024
      const tablet = w >= 700 && w < 1024
      const gap = desktop ? 40 : tablet ? 30 : 20
      // denom = peekFraction * 0.9 + 0.5   (peek: .5 desktop, .35 tablet, .25 mobile)
      const denom = desktop ? 0.95 : tablet ? 0.815 : 0.725
      const cap = desktop ? 620 : tablet ? 520 : 300
      const centerW = Math.max(200, Math.min((H - gap) / denom, cap))
      const sideW = centerW * 0.9
      const step = centerW / 2 + gap + sideW / 2
      setM({ centerW, sideW, step })
    }
    compute()
    const ro = new ResizeObserver(compute)
    const el = trackRef.current
    if (el) ro.observe(el)
    window.addEventListener('resize', compute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', compute)
    }
  }, [])

  // ---- idle autoplay: one gentle step after 60s of no interaction ----
  useEffect(() => {
    if (reduce || paused || dragging || n < 3) return
    const id = window.setTimeout(() => {
      go(1)
      setNudge((x) => x + 1)
    }, IDLE_AUTOPLAY_MS)
    return () => window.clearTimeout(id)
  }, [reduce, paused, dragging, n, go, nudge])

  useEffect(() => {
    if (active >= n) setActive(0)
  }, [active, n])

  useEffect(() => {
    const onVis = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  // ---- drag / swipe / trackpad ----
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button != null && e.button !== 0) return
    p.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, axis: '' }
    setPaused(true)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerId !== p.current.id) return
    const dx = e.clientX - p.current.startX
    const dy = e.clientY - p.current.startY
    if (!p.current.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      p.current.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (p.current.axis === 'x') {
        setDragging(true)
        try {
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        } catch {
          /* noop */
        }
      }
    }
    if (p.current.axis === 'x') {
      pendingDx.current = dx
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          setDrag(pendingDx.current)
          rafRef.current = 0
        })
      }
    }
  }

  const endPointer = () => {
    if (p.current.axis === 'x') {
      const delta = Math.max(-2, Math.min(2, Math.round(-drag / m.step)))
      if (delta !== 0) setActive((a) => (((a + delta) % n) + n) % n)
    }
    p.current = { id: -1, startX: 0, startY: 0, axis: '' }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    setDrag(0)
    setDragging(false)
    bump()
    window.setTimeout(() => setPaused(false), 400)
  }

  const onWheel = (e: React.WheelEvent) => {
    const mag = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0
    if (Math.abs(mag) < 24) return
    const now = Date.now()
    if (now < wheelLock.current) return
    wheelLock.current = now + 420
    bump()
    go(mag > 0 ? 1 : -1)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      bump()
      go(-1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      bump()
      go(1)
    }
  }

  const { centerW, step } = m
  const centerH = Math.round(centerW * 0.62)
  const pad = 26 // vertical room inside the clipped stage for card shadows

  return (
    <div
      ref={trackRef}
      className={`relative z-10 mx-auto w-full overflow-hidden touch-pan-y select-none ${
        dragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{ height: centerH + pad * 2, maxWidth: 1180 }}
      role="group"
      aria-roledescription="carousel"
      aria-label="Featured projects — drag, swipe or use the arrow keys"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => !dragging && setPaused(false)}
      tabIndex={0}
    >
      {slides.map((slide, i) => {
        const offset = ringOffset(i, active, n)
        if (Math.abs(offset) > 2) return null

        const eo = offset + (dragging ? drag / step : 0)
        const a = Math.min(Math.abs(eo), 2)
        const scale = 1 - a * 0.1 // centre 1.0 → side ~0.9 → far ~0.8
        const opacity = Math.max(0, 1 - a * 0.42)
        const isCenter = offset === 0

        const inner = (
          <span className="absolute inset-3 overflow-hidden rounded-[calc(var(--radius-large)-12px)] bg-[var(--bg-subtle)] ring-1 ring-inset ring-black/[0.06] sm:inset-4 lg:inset-5">
            {slide.image ? (
              <NextImage
                src={slide.image}
                alt={slide.title}
                fill
                sizes="(max-width: 768px) 62vw, (max-width: 1024px) 56vw, 560px"
                quality={88}
                priority={isCenter}
                draggable={false}
                className="object-cover object-[50%_0%] transition-transform duration-[900ms] ease-out group-hover:scale-[1.02]"
              />
            ) : (
              <span className="grid h-full w-full place-items-center">
                <SvgIcon name="portfolio" size={34} color="var(--text-muted)" />
              </span>
            )}
          </span>
        )

        // clean, intentional white frame — reads premium against the dark
        // atmospheric portfolio background; a hairline ring separates it in both themes
        const frameClass =
          'group relative block h-full w-full rounded-[var(--radius-large)] bg-white shadow-[var(--shadow-lg)] ring-1 ring-black/[0.06] transition-shadow duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] dark:ring-white/15'

        return (
          <motion.div
            key={slide.id}
            className="absolute left-1/2"
            style={{ width: centerW, height: centerH, top: pad, zIndex: Math.round(30 - a * 10) }}
            initial={false}
            animate={{ x: eo * step - centerW / 2, scale, opacity }}
            transition={
              dragging ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 30, mass: 0.9 }
            }
          >
            {slide.external ? (
              <a
                href={isCenter ? slide.href : undefined}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={isCenter ? 0 : -1}
                aria-hidden={!isCenter}
                aria-label={`Open ${slide.title} website in a new tab`}
                onClick={(e) => {
                  if (!isCenter) {
                    e.preventDefault()
                    bump()
                    setActive(i)
                  }
                }}
                className={frameClass}
                draggable={false}
              >
                {inner}
              </a>
            ) : (
              <Link
                href={slide.href}
                tabIndex={isCenter ? 0 : -1}
                aria-hidden={!isCenter}
                aria-label={slide.title}
                onClick={(e) => {
                  if (!isCenter) {
                    e.preventDefault()
                    bump()
                    setActive(i)
                  }
                }}
                className={frameClass}
                draggable={false}
              >
                {inner}
              </Link>
            )}
          </motion.div>
        )
      })}

      <p className="sr-only" aria-live="polite">
        {slides[active] ? `Showing ${slides[active].title}` : ''}
      </p>
    </div>
  )
}
