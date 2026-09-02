'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import SvgIcon from '@/components/ui/SvgIcon'
import ConsultationPopup from '@/components/ConsultationPopup'
import HeroFluid from '@/components/home/HeroFluid'

interface HeroProps {
  /**
   * Admin-configured Hero content, mapped from the existing `hero_section`
   * row by HomePageClient. Every field is optional and falls back to the
   * redesigned default when empty — so a blank row renders the intended
   * redesigned Hero, and there is nothing legacy that can silently override it.
   *
   *  - `eyebrow` ← hero_section.welcome_text  — small label above the headline.
   *  - `title`   ← hero_section.title         — the fixed part of the headline,
   *                shown before the rotating phrase.
   *  - `phrases` ← hero_section.feature_bullets — the rotating phrases. Accepts a
   *                string ("A | B | C" or newline-separated) or a string[].
   *  - `subtitle`← hero_section.subtitle
   *  - `image`   ← hero_section.background_image — project mockup / screenshot.
   *                Recommended 1600×1200 (4:3); any ratio is safe (object-contain).
   *  - `video`   ← hero_section.video_url — shown instead of `image` when set.
   */
  data?: {
    title?: string | null
    subtitle?: string | null
    eyebrow?: string | null
    phrases?: string | string[] | null
    image?: string | null
    video?: string | null
  }
}

const HEADLINE_PREFIX = 'We build the digital systems that grow'
const ROTATING_PHRASES = [
  'Ambitious Brands',
  'E-commerce Teams',
  'Growth Companies',
  'Better Experiences',
]
const DEFAULT_SUBTITLE = 'Strategy, design and build for e-commerce and modern teams.'
const DEFAULT_EYEBROW = 'Digital Growth Studio'
const PHRASE_INTERVAL = 3200

/**
 * Pre-redesign content that still lives in the `hero_section` row. These exact
 * strings are treated as "not set" so the redesigned defaults render until an
 * admin replaces them from /admin/hero (a Supabase write we cannot perform from
 * here). Any other value the admin enters is used verbatim.
 */
const LEGACY_HERO_VALUES = new Set([
  'Engineering Growth For',
  'We build scalable digital systems, conversion-focused experiences, and growth infrastructure for ambitious e-commerce and modern businesses.',
  'Brand Identity|24/7 Support',
])

function liveValue(raw: string | null | undefined): string {
  const v = (raw ?? '').trim()
  return LEGACY_HERO_VALUES.has(v) ? '' : v
}

/** Accept a string ("A | B" / newline-separated) or string[] → trimmed list. */
function parsePhrases(raw: string | string[] | null | undefined): string[] {
  if (typeof raw === 'string' && LEGACY_HERO_VALUES.has(raw.trim())) return []
  const source = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[|\n]/) : []
  return source.map((s) => String(s).trim()).filter(Boolean)
}

const trustPoints = ['No-risk consultation', 'Transparent pricing', 'Ongoing support']

function fade(reduce: boolean | null, delay = 0) {
  return {
    initial: reduce ? undefined : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay },
  }
}

/** Neutral, theme-aware frame for an admin-selected project image / video. */
function HeroVisualFrame({
  image,
  video,
  fluidBackdrop = false,
}: {
  image?: string | null
  video?: string | null
  fluidBackdrop?: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-large)] border border-[var(--border)] bg-[var(--surface)]/75 shadow-[var(--shadow-lg)] backdrop-blur-sm">
      {fluidBackdrop ? <HeroFluid className="opacity-35" /> : null}
      <div className="relative aspect-[4/3] w-full">
        {video ? (
          <video
            src={video}
            poster={image ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-contain p-2 sm:p-3"
          />
        ) : image ? (
          <img
            src={image}
            alt="Selected Hbee Digitals project"
            loading="eager"
            className="absolute inset-0 h-full w-full object-contain p-2 sm:p-3"
          />
        ) : null}
      </div>
    </div>
  )
}

export default function Hero({ data }: HeroProps) {
  const reduce = useReducedMotion()
  const [consultOpen, setConsultOpen] = useState(false)
  const [phraseIdx, setPhraseIdx] = useState(0)

  // Admin-configured content with redesigned defaults when a field is empty
  // (or still holds a known pre-redesign value — see LEGACY_HERO_VALUES).
  const eyebrow = liveValue(data?.eyebrow) || DEFAULT_EYEBROW
  const prefix = liveValue(data?.title) || HEADLINE_PREFIX
  const parsed = parsePhrases(data?.phrases)
  const phrases = parsed.length > 0 ? parsed : ROTATING_PHRASES
  const subtitle = liveValue(data?.subtitle) || DEFAULT_SUBTITLE
  const image = data?.image?.trim() || ''
  const video = data?.video?.trim() || ''
  const hasVisual = Boolean(image || video)

  const activeIdx = phraseIdx % phrases.length

  useEffect(() => {
    if (reduce || phrases.length < 2) return
    const id = window.setInterval(
      () => setPhraseIdx((i) => (i + 1) % phrases.length),
      PHRASE_INTERVAL,
    )
    return () => window.clearInterval(id)
  }, [reduce, phrases.length])

  return (
    <section className="relative overflow-hidden bg-[var(--bg)] pt-24 pb-12 sm:pt-28 sm:pb-14 lg:pt-28 lg:pb-16">
      {/* Desktop atmosphere — fluid on the right, fading toward the headline */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[54%] lg:block"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 34%, #000 100%)',
          maskImage: 'linear-gradient(to right, transparent 0%, #000 34%, #000 100%)',
        }}
      >
        <HeroFluid />
      </div>

      <Container className="relative z-10 w-full">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-0">
          <div className="lg:col-span-6">
            <motion.p
              {...fade(reduce)}
              className="text-[length:var(--fs-eyebrow)] font-semibold uppercase leading-none tracking-[var(--ls-eyebrow)] text-[var(--accent)]"
            >
              {eyebrow}
            </motion.p>

            <motion.h1
              {...fade(reduce, 0.05)}
              className="mt-3 max-w-[12em] text-[clamp(1.6rem,0.9rem+2.7vw,3rem)] font-bold leading-[1.12] tracking-[var(--ls-h1)] text-[var(--text)]"
            >
              {prefix}{' '}
              {/* the phrase always sits on its own line (block); the grid stacks
                  every phrase in one cell → sized to the longest phrase, so the
                  headline height and the CTA position never shift on rotate. */}
              <span className="mt-1 grid w-fit [overflow-wrap:break-word]">
                {phrases.map((phrase, i) => (
                  <motion.span
                    key={`${phrase}-${i}`}
                    aria-hidden={i !== activeIdx}
                    className="col-start-1 row-start-1 text-[var(--accent)]"
                    initial={false}
                    animate={
                      i === activeIdx
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: reduce ? 0 : 6 }
                    }
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {phrase}.
                  </motion.span>
                ))}
              </span>
            </motion.h1>

            <motion.p
              {...fade(reduce, 0.1)}
              className="mt-3 max-w-[44ch] text-[length:var(--fs-body-lg)] leading-[var(--lh-body-lg)] text-[var(--text-secondary)]"
            >
              {subtitle}
            </motion.p>

            <motion.div {...fade(reduce, 0.15)} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href="/contact" variant="cta" size="lg" icon={<Arrow />}>
                Start a Project
              </Button>
              <Button href="/portfolio" variant="secondary" size="lg" icon={<Arrow />}>
                Explore Our Work
              </Button>
            </motion.div>

            <motion.div {...fade(reduce, 0.2)} className="mt-3">
              <button
                type="button"
                onClick={() => setConsultOpen(true)}
                className="text-[length:var(--fs-body-sm)] font-medium text-[var(--text-secondary)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                or book a free consultation
              </button>
            </motion.div>

            <motion.ul
              {...fade(reduce, 0.25)}
              className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[length:var(--fs-caption)] text-[var(--text-muted)]"
            >
              {trustPoints.map((point) => (
                <li key={point} className="flex items-center gap-1.5">
                  <SvgIcon name="verified" size={13} color="var(--accent)" />
                  {point}
                </li>
              ))}
            </motion.ul>
          </div>

          {/* Desktop right column — the framed project visual over the fluid.
              When no image is set, the fluid alone fills the space. */}
          {hasVisual ? (
            <motion.div
              {...fade(reduce, 0.15)}
              className="hidden lg:col-span-6 lg:block"
            >
              <HeroVisualFrame image={image} video={video} />
            </motion.div>
          ) : null}

          {/* Mobile / tablet visual */}
          <div className="lg:hidden">
            {hasVisual ? (
              <HeroVisualFrame image={image} video={video} fluidBackdrop />
            ) : (
              <div className="relative h-[240px] overflow-hidden rounded-[var(--radius-large)] border border-[var(--border)] sm:h-[300px]">
                <HeroFluid />
              </div>
            )}
          </div>
        </div>
      </Container>

      <ConsultationPopup isOpen={consultOpen} onClose={() => setConsultOpen(false)} />
    </section>
  )
}

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
