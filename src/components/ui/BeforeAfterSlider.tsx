'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import NextImage from 'next/image'

interface BeforeAfterSliderProps {
  beforeImage: string
  afterImage: string
  beforeLabel?: string
  afterLabel?: string
  fallbackImage?: string
}

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'BEFORE',
  afterLabel = 'AFTER',
  fallbackImage = '/svgs/logo.svg',
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  const [imgBefore, setImgBefore] = useState(beforeImage)
  const [imgAfter, setImgAfter] = useState(afterImage)

  useEffect(() => {
    setImgBefore(beforeImage)
    setImgAfter(afterImage)
  }, [beforeImage, afterImage])

  const setFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(100, Math.max(0, pct)))
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    setDragging(true)
    setHasInteracted(true)
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    setFromClientX(e.clientX)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    setFromClientX(e.clientX)
  }

  const endDrag = () => setDragging(false)

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setHasInteracted(true)
      setPos((p) => Math.max(0, p - step))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setHasInteracted(true)
      setPos((p) => Math.min(100, p + step))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setPos(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setPos(100)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-[var(--radius-large)] border border-[var(--border)] bg-[var(--bg-subtle)]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* After image — full frame */}
      <NextImage
        src={imgAfter}
        alt={afterLabel}
        fill
        sizes="(max-width: 1024px) 100vw, 1100px"
        quality={85}
        draggable={false}
        onError={() => setImgAfter(fallbackImage)}
        className="object-cover object-top"
      />
      <span className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
        {afterLabel}
      </span>

      {/* Before image — clipped overlay (no width math, cannot divide by zero) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <NextImage
          src={imgBefore}
          alt={beforeLabel}
          fill
          sizes="(max-width: 1024px) 100vw, 1100px"
          quality={85}
          draggable={false}
          onError={() => setImgBefore(fallbackImage)}
          className="object-cover object-top"
        />
        <span className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {beforeLabel}
        </span>
      </div>

      {/* Divider + handle */}
      <div
        className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
        style={{ left: `${pos}%` }}
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label="Reveal before or after image"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          aria-valuetext={`${Math.round(pos)}% before image visible`}
          onKeyDown={onKeyDown}
          className="absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full border-2 border-[var(--cta)] bg-white shadow-[var(--shadow-lg)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[var(--cta)]">
            <path d="M8.5 7L4 12l4.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15.5 7L20 12l-4.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Hint — fades out once the user has moved the handle */}
      {!hasInteracted && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          Drag to compare
        </div>
      )}
    </div>
  )
}
