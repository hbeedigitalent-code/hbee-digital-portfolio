'use client'

import { useState, type CSSProperties } from 'react'
import NextImage from 'next/image'
import { cn } from '@/lib/cn'

interface ImageProps {
  src: string
  alt: string
  /** CSS aspect-ratio for the frame, e.g. "16/9", "4/3", "1/1". */
  aspectRatio?: string
  /** object-fit for the image. */
  fit?: 'cover' | 'contain'
  /** object-position, e.g. "center", "top", "50% 20%". */
  position?: string
  /** Explicit intrinsic size (omit when using aspectRatio + fill). */
  width?: number
  height?: number
  priority?: boolean
  sizes?: string
  quality?: number
  rounded?: 'none' | 'card' | 'large' | 'full'
  /** class for the outer frame */
  className?: string
  /** class for the <img> itself */
  imgClassName?: string
  style?: CSSProperties
}

const ROUNDED: Record<NonNullable<ImageProps['rounded']>, string> = {
  none: '',
  card: 'rounded-[var(--radius-card)]',
  large: 'rounded-[var(--radius-large)]',
  full: 'rounded-full',
}

/**
 * Canonical image primitive. Consolidates the intended roles of
 * OptimizedImage + PremiumImage: a ratio-locked, overflow-clipped frame with
 * a next/image inside, a token-coloured placeholder, and a graceful error
 * fallback. Restrained — no hover zoom, no gradient scrim by default.
 */
export default function Image({
  src,
  alt,
  aspectRatio,
  fit = 'cover',
  position = 'center',
  width,
  height,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 82,
  rounded = 'card',
  className,
  imgClassName,
  style,
}: ImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const useFill = Boolean(aspectRatio) || (!width && !height)

  return (
    <div
      className={cn('relative overflow-hidden bg-[var(--bg-subtle)]', ROUNDED[rounded], className)}
      style={{ aspectRatio: aspectRatio, ...style }}
    >
      {!loaded && !errored ? (
        <div className="absolute inset-0 animate-pulse bg-[var(--bg-subtle)] motion-reduce:animate-none" />
      ) : null}

      {errored ? (
        <div className="absolute inset-0 grid place-items-center text-[length:var(--fs-caption)] text-[var(--text-muted)]">
          Image unavailable
        </div>
      ) : (
        <NextImage
          src={src}
          alt={alt}
          {...(useFill ? { fill: true } : { width: width ?? 0, height: height ?? 0 })}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          sizes={sizes}
          quality={quality}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            'transition-opacity duration-[var(--dur-entrance)]',
            loaded ? 'opacity-100' : 'opacity-0',
            fit === 'cover' ? 'object-cover' : 'object-contain',
            useFill ? 'h-full w-full' : 'h-auto w-full',
            imgClassName,
          )}
          style={{ objectPosition: position }}
        />
      )}
    </div>
  )
}
