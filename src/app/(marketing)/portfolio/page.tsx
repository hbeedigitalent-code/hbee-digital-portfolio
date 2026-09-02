'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

interface PortfolioItem {
  id: string
  name?: string
  title?: string
  slug?: string
  category?: string
  tag?: string
  result?: string
  description?: string
  image_url?: string
  featured_image?: string
  featured?: boolean
  url?: string
  project_url?: string
  client_name?: string
  project_type?: string
  metric_label?: string
  metric_value?: string
  industry?: string
  technology?: string
  website_url?: string
  brief?: string
  results_summary?: string
  before_image?: string
  after_image?: string
  gallery_images?: any[]
  result_metrics?: any[]
  is_before_after?: boolean
}

function getTitle(item: PortfolioItem) {
  return item.client_name || item.title || item.name || 'Portfolio Project'
}

function getProjectType(item: PortfolioItem) {
  return item.project_type || item.description || 'Conversion-focused digital system'
}

function getImage(item: PortfolioItem) {
  return item.featured_image || item.image_url || item.after_image || ''
}

function getHref(item: PortfolioItem) {
  if (item.slug) return `/portfolio/${item.slug}`
  return item.url || item.project_url || '/portfolio'
}

function getMetric(item: PortfolioItem) {
  if (item.metric_value && item.metric_label) {
    return `${item.metric_value} ${item.metric_label}`
  }
  if (item.metric_value) return item.metric_value
  if (item.result) return item.result
  return 'Growth'
}

function getCategory(item: PortfolioItem) {
  return item.category || item.tag || item.industry || 'Case Study'
}

const CATEGORIES = [
  { id: 'all', name: 'All', icon: '/icons/portfolio/all.svg.png' },
  { id: 'clothing', name: 'Clothing', icon: '/icons/portfolio/clothing.svg.png' },
  { id: 'food', name: 'Food', icon: '/icons/portfolio/food.svg.png' },
  { id: 'healthcare', name: 'Healthcare', icon: '/icons/portfolio/health-care.svg.png' },
  { id: 'jewellery', name: 'Jewellery', icon: '/icons/portfolio/jewellery.svg.png' },
  { id: 'kids', name: 'Kids', icon: '/icons/portfolio/kids-clothing.svg.png' },
  { id: 'branding', name: 'Branding', icon: '/icons/portfolio/logos.svg.png' },
  { id: 'pets', name: 'Pets', icon: '/icons/portfolio/pets.svg.png' },
  { id: 'skincare', name: 'Skin care', icon: '/icons/portfolio/skin-care.svg.png' },
  { id: 'sports', name: 'Sports', icon: '/icons/portfolio/sports-fitness.svg.png' },
  { id: 'redesign', name: 'Redesign', icon: '/icons/portfolio/store-redesign.svg' },
  { id: 'teacoffee', name: 'Tea/Coffee', icon: '/icons/portfolio/tea-coffee.svg.png' },
]

export default function PortfolioPage() {
  const reducedMotion = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    
    async function fetchItems() {
      const { data } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      setItems(data || [])
      setLoading(false)
    }

    fetchItems()
  }, [])

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items
    return items.filter((item) => {
      const itemCategory = (item.category || '').toLowerCase()
      return itemCategory.includes(activeCategory)
    })
  }, [activeCategory, items])

  // Don't render during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <>
        <main className="relative min-h-screen bg-[var(--bg-page)] pt-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
            <div className="animate-pulse">
              <div className="h-8 w-32 rounded-full bg-[var(--bg-section)] mb-4" />
              <div className="h-12 w-3/4 rounded-lg bg-[var(--bg-section)] mb-4" />
              <div className="h-20 w-full rounded-lg bg-[var(--bg-section)]" />
              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="rounded-2xl bg-[var(--bg-card)] overflow-hidden">
                    <div className="aspect-[4/3] bg-[var(--bg-section)]" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 w-20 bg-[var(--bg-section)] rounded" />
                      <div className="h-6 w-3/4 bg-[var(--bg-section)] rounded" />
                      <div className="h-4 w-full bg-[var(--bg-section)] rounded" />
                      <div className="h-4 w-2/3 bg-[var(--bg-section)] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <main className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </main>
      </>
    )
  }

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-[var(--bg-page)] pt-28">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent)]/5 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[var(--accent-orange)]/5 blur-[130px]" />
        </div>

        {/* Hero */}
        <section className="px-5 pb-8 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-4xl"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1 mb-4">
                <SvgIcon name="portfolio" size={14} color="var(--accent)" />
                <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                  Portfolio / Case Studies
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.02em] text-[var(--text-primary)]">
                Digital systems built to{' '}
                <span className="text-[var(--accent)]">perform.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base text-[var(--text-secondary)]">
                Explore selected ecommerce builds, redesigns, before-and-after improvements,
                and conversion-focused systems created to improve trust, usability, and growth.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Categories */}
        <section className="px-5 py-8 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {CATEGORIES.map((category) => {
                const isActive = activeCategory === category.id
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`flex flex-col items-center rounded-xl px-4 py-2 transition-all duration-200 ${
                      isActive
                        ? 'bg-[var(--accent)]/10'
                        : 'hover:bg-[var(--bg-section)]'
                    }`}
                  >
                    <img
                      src={category.icon}
                      alt={category.name}
                      className="h-6 w-6 object-contain"
                      style={{
                        filter: isActive
                          ? 'brightness(0) saturate(100%) invert(53%) sepia(98%) saturate(1236%) hue-rotate(1deg) brightness(102%) contrast(101%)'
                          : 'brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) brightness(90%) contrast(90%)'
                      }}
                    />
                    <span className={`mt-1 text-xs font-medium ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                      {category.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Portfolio Grid */}
        <section className="px-5 py-12 pb-24 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {filteredItems.map((item, index) => (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <Link href={getHref(item)} className="block">
                      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]">
                        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--bg-section)]">
                          {getImage(item) ? (
                            <img
                              src={getImage(item)}
                              alt={getTitle(item)}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <SvgIcon name="portfolio" size={48} color="var(--text-muted)" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3">
                            <span className="rounded-full bg-[var(--accent)] px-2 py-1 text-[10px] font-bold text-white">
                              {getMetric(item)}
                            </span>
                          </div>
                          {item.is_before_after && (
                            <div className="absolute top-3 right-3">
                              <span className="rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                                Before/After
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                            {getCategory(item)}
                          </p>
                          <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)] line-clamp-1">
                            {getTitle(item)}
                          </h3>
                          <p className="mt-2 text-sm text-[var(--text-secondary)] line-clamp-2">
                            {getProjectType(item)}
                          </p>
                          <div className="mt-4 flex items-center justify-between pt-2 border-t border-[var(--border)]">
                            <div className="flex gap-2">
                              <span className="rounded-full bg-[var(--bg-section)] px-2 py-0.5 text-[9px] font-semibold text-[var(--text-muted)]">
                                {item.industry || getCategory(item)}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] transition-all group-hover:gap-2">
                              View Case
                              <SvgIcon name="arrow-right" size={12} color="var(--accent)" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                ))}
              </motion.div>
            </AnimatePresence>

            {filteredItems.length === 0 && (
              <div className="py-20 text-center">
                <SvgIcon name="portfolio" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
                <p className="text-[var(--text-secondary)]">No projects found in this category.</p>
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-24 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--bg-navy)] p-8 text-center sm:p-12">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Ready for your transformation?
              </p>
              <h2 className="mx-auto mt-4 max-w-2xl text-2xl sm:text-3xl font-bold text-white">
                Let's build a digital system that improves trust and drives growth.
              </h2>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button href="/contact" variant="cta" size="md">
                  Get Free Consultation
                </Button>
                <Button href="/services" variant="outline-dark" size="md">
                  View Services
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}