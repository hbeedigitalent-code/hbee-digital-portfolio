'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import NextImage from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'
import PortfolioCarousel, { type CarouselSlide } from '@/components/home/PortfolioCarousel'

interface PortfolioItem {
  id: string
  title?: string
  name?: string
  client_name?: string
  slug?: string
  category?: string
  industry?: string
  project_type?: string
  image_url?: string
  featured_image?: string
  metric_value?: string
  metric_label?: string
  is_active?: boolean
  display_order?: number
  featured?: boolean
  url?: string
  live_url?: string
  website_url?: string
  project_url?: string
}

function getImage(item: PortfolioItem) {
  return item.featured_image || item.image_url || ''
}

function getTitle(item: PortfolioItem) {
  return item.title || item.name || item.client_name || 'Portfolio Project'
}

/** the live project website, if one is configured */
function getExternalUrl(item: PortfolioItem) {
  const raw = item.url || item.live_url || item.website_url || item.project_url || ''
  return /^https?:\/\//i.test(raw.trim()) ? raw.trim() : ''
}

/** external website when available, otherwise the internal case-study page */
function getDestination(item: PortfolioItem): { href: string; external: boolean } {
  const ext = getExternalUrl(item)
  if (ext) return { href: ext, external: true }
  return { href: item.slug ? `/portfolio/${item.slug}` : `/portfolio/${item.id}`, external: false }
}

export default function FeaturedPortfolioSection({
  items = [],
}: {
  items?: PortfolioItem[]
}) {
  const reducedMotion = useReducedMotion()
  const [fetchedItems, setFetchedItems] = useState<PortfolioItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (items.length > 0) return

    let mounted = true

    async function fetchPortfolioItems() {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('portfolio_items')
        .select(
          'id, title, name, client_name, slug, category, industry, project_type, image_url, featured_image, metric_value, metric_label, is_active, display_order, featured, url, live_url, website_url, project_url'
        )
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(30)

      if (!mounted) return

      if (error) {
        console.error('Featured portfolio fetch error:', error)
        setFetchedItems([])
      } else {
        setFetchedItems(data || [])
      }

      setIsLoading(false)
    }

    fetchPortfolioItems()

    return () => {
      mounted = false
    }
  }, [items.length])

  const portfolioItems = useMemo(() => {
    const source = items.length > 0 ? items : fetchedItems
    return source.filter((item) => item?.id && getImage(item))
  }, [items, fetchedItems])

  const slides: CarouselSlide[] = useMemo(
    () =>
      portfolioItems.map((item) => {
        const dest = getDestination(item)
        return {
          id: String(item.id),
          title: getTitle(item),
          image: getImage(item),
          href: dest.href,
          external: dest.external,
        }
      }),
    [portfolioItems]
  )

  // admin controls the initially-focused card via the existing `featured` flag
  // (items are already ordered by `display_order`)
  const initialIndex = useMemo(() => {
    const idx = portfolioItems.findIndex((item) => item.featured)
    return idx >= 0 ? idx : 0
  }, [portfolioItems])

  if (!isLoading && portfolioItems.length === 0) {
    return (
      <section className="relative overflow-hidden bg-[var(--bg-section)] px-5 py-16 text-center sm:px-6 lg:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
              FEATURED WORK
            </span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Systems We Built for Growth.
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
            Active portfolio projects have not been added yet. Once projects
            are added from the admin dashboard, they will appear here
            automatically.
          </p>
          <Button href="/portfolio" variant="primary" size="md" className="mt-8">
            View All Work
            <SvgIcon name="arrow-diagonal" size={14} color="white" className="ml-2 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Button>
        </div>
      </section>
    )
  }

  if (portfolioItems.length === 0) return null

  return (
    <section className="relative overflow-hidden bg-[var(--bg-section)] py-16 sm:py-20 lg:py-24">
      {/*
        The Portfolio section's OWN atmospheric background — the real
        section-scoped photograph (public/portfolio-atmosphere.webp), positioned
        behind the content under a dark-navy + brand-blue wash so it reads at
        ~25–35% (a team/workspace is still recognisable) while the heading,
        cards and "View all work" button stay clearly readable. Top/bottom fades
        blend it into the surrounding page. It belongs to this <section> only —
        no other homepage section or route renders it, and it is NOT derived
        from any portfolio card image.
      */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <img
          src="/portfolio-atmosphere.webp"
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-[center_38%]"
        />
        {/* dark-navy + brand-blue wash (theme-aware) — subdues the photo to a faint background atmosphere */}
        <div className="absolute inset-0 bg-[var(--bg-section)]/[0.86] dark:bg-[var(--navy-900)]/[0.84]" />
        <div className="absolute inset-0 bg-[radial-gradient(115%_80%_at_50%_22%,rgba(37,99,235,0.10),transparent_72%)] dark:bg-[radial-gradient(115%_80%_at_50%_22%,rgba(59,130,246,0.18),transparent_72%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-section)]/40 dark:to-[var(--navy-900)]/45" />
        {/* blend into the surrounding page */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[var(--bg-section)] to-transparent dark:from-[var(--navy-900)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--bg-section)] to-transparent dark:from-[var(--navy-900)]" />
      </div>

      {/* Section Header */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        viewport={{ once: true }}
        className="relative z-10 mx-auto max-w-3xl px-5 text-center sm:px-6"
      >
        <p className="text-[length:var(--fs-eyebrow)] font-semibold uppercase tracking-[var(--ls-eyebrow)] text-[var(--accent)]">
          Featured Work
        </p>

        <h2 className="mt-3 text-[length:var(--fs-h1)] font-semibold leading-[var(--lh-h1)] tracking-[var(--ls-h1)] text-[var(--text)]">
          Systems we built for <span className="text-[var(--accent)]">growth</span>
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-[length:var(--fs-body-lg)] leading-[var(--lh-body-lg)] text-[var(--text-secondary)]">
          Real brands. Real results. A selection of recent work that helped businesses
          improve performance and scale with clarity.
        </p>
      </motion.div>

      {/* Dimensional infinite carousel — full-bleed; the stage clips its own side cards */}
      <div className="relative z-10 mt-14">
        {slides.length >= 3 ? (
          <PortfolioCarousel slides={slides} initialIndex={initialIndex} />
        ) : (
          <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-6 px-5 sm:px-6">
            {slides.map((slide) => {
              const frame =
                'group relative block w-full max-w-md rounded-[var(--radius-large)] border border-white/70 bg-white/70 p-2.5 shadow-[var(--shadow-lg)] backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]'
              const body = (
                <span className="block overflow-hidden rounded-[calc(var(--radius-large)-10px)] bg-[var(--bg-subtle)]">
                  <span className="relative block aspect-[16/10]">
                    <NextImage
                      src={slide.image}
                      alt={slide.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 448px"
                      quality={88}
                      className="object-cover object-[50%_0%] transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    />
                  </span>
                </span>
              )
              return slide.external ? (
                <a key={slide.id} href={slide.href} target="_blank" rel="noopener noreferrer" className={frame} aria-label={`Open ${slide.title} website in a new tab`}>
                  {body}
                </a>
              ) : (
                <Link key={slide.id} href={slide.href} className={frame} aria-label={slide.title}>
                  {body}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="relative z-10 mt-14 text-center">
        <Button href="/portfolio" variant="cta" size="lg">
          View all work
          <SvgIcon name="arrow-diagonal" size={16} color="currentColor" className="ml-2" />
        </Button>
      </div>
    </section>
  )
}