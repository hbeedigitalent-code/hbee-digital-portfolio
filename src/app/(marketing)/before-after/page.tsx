// src/app/before-after/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

import SvgIcon from '@/components/ui/SvgIcon'
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'

interface PortfolioItem {
  id: string
  name?: string
  client_name?: string
  title?: string
  slug?: string
  category?: string
  description?: string
  before_image?: string
  after_image?: string
  metric_value?: string
  metric_label?: string
  project_type?: string
  results_summary?: string
}

export default function BeforeAfterPage() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      const { data: projects } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('is_active', true)
        .eq('is_before_after', true)
        .order('display_order', { ascending: true })

      setItems(projects || [])
      setLoading(false)
    }

    fetchProjects()
  }, [])

  const getTitle = (item: PortfolioItem) => {
    return item.client_name || item.title || item.name || 'Project Transformation'
  }

  const getMetric = (item: PortfolioItem) => {
    if (item.metric_value && item.metric_label) {
      return `${item.metric_value} ${item.metric_label}`
    }
    return item.metric_value || 'Growth'
  }

  if (loading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
        </div>
      </>
    )
  }

  return (
    <>

      <main className="relative overflow-hidden bg-[var(--bg-page)] pt-28 text-[var(--text-primary)]">
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent)]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[var(--accent-lime)]/5 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
        </div>

        {/* Hero Section */}
        <motion.section
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="px-5 py-16 sm:px-6 md:px-10 lg:px-12"
        >
          <div className="mx-auto max-w-7xl text-center">
            <motion.div variants={staggerItem}>
              <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--accent)]">
                <SvgIcon name="portfolio" size={14} color="var(--accent)" />
                Before & After Transformations
              </p>
            </motion.div>

            <motion.h1 variants={staggerItem} className="mx-auto max-w-5xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
              See the <span className="text-[var(--accent)]">transformation.</span>
            </motion.h1>

            <motion.p variants={staggerItem} className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[var(--text-secondary)]">
              Witness how outdated websites and stores are transformed into modern,
              premium, conversion-focused digital experiences.
            </motion.p>

            <motion.div variants={staggerItem} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="btn-primary inline-flex min-h-[52px] items-center justify-center px-7 py-3 text-sm font-black"
              >
                Start Your Transformation
              </Link>
              <Link
                href="/portfolio"
                className="btn-secondary inline-flex min-h-[52px] items-center justify-center gap-2 px-7 py-3 text-sm font-black"
              >
                View All Work
                <SvgIcon name="arrow-diagonal" size={15} color="var(--accent)" />
              </Link>
            </motion.div>
          </div>
        </motion.section>

        {/* Before/After Grid */}
        <section className="px-5 pb-24 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl space-y-12">
            {items.map((item: PortfolioItem, index: number) => {
              const title = getTitle(item)
              const metric = getMetric(item)
              const hasBeforeAfter = item.before_image && item.after_image

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all duration-300 hover:shadow-[var(--shadow-lg)] hover:-translate-y-1"
                >
                  {/* Header */}
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">
                        Transformation {String(index + 1).padStart(2, '0')}
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)] sm:text-3xl">
                        {title}
                      </h2>
                      {item.category && (
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{item.category}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <span className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-black text-white">
                        {metric}
                      </span>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-3 py-1.5 text-xs font-black text-[var(--text-muted)]">
                        Before → After
                      </span>
                    </div>
                  </div>

                  {/* Before/After Images - Using Slider for each */}
                  {hasBeforeAfter ? (
                    <BeforeAfterSlider
                      beforeImage={item.before_image!}
                      afterImage={item.after_image!}
                      beforeLabel="BEFORE"
                      afterLabel="AFTER"
                    />
                  ) : (
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-[var(--text-muted)]">Before</p>
                        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-section)]">
                          <SvgIcon name="image" size={48} color="var(--text-muted)" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-[var(--accent)]">After</p>
                        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-[var(--accent)]/20 bg-[var(--bg-section)]">
                          <SvgIcon name="image" size={48} color="var(--accent)" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Description and Link */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--border)]">
                    <p className="text-sm text-[var(--text-secondary)]">
                      {item.results_summary ||
                        item.description ||
                        'A focused transformation built around trust, mobile experience, and conversion clarity.'}
                    </p>
                    <Link
                      href={item.slug ? `/portfolio/${item.slug}` : '/portfolio'}
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-4 py-2 text-sm font-black text-[var(--accent)] transition-all duration-200 hover:bg-[var(--accent)]/20 hover:gap-3"
                    >
                      View Full Case Study
                      <SvgIcon name="arrow-diagonal" size={14} color="var(--accent)" />
                    </Link>
                  </div>
                </motion.div>
              )
            })}

            {items.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center"
              >
                <SvgIcon name="portfolio" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
                <h2 className="text-xl font-black text-[var(--text-primary)]">No before/after projects yet</h2>
                <p className="mt-2 text-[var(--text-secondary)]">
                  Add projects from the admin portfolio page and enable the "Show in Before/After" option.
                </p>
              </motion.div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="px-5 pb-24 sm:px-6 md:px-10 lg:px-12"
        >
          <div className="mx-auto max-w-7xl rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-r from-[var(--accent)]/5 to-transparent p-8 text-center sm:p-12">
            <p className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">Ready for your transformation?</p>
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black leading-tight text-[var(--text-primary)] sm:text-4xl">
              Let's create a digital experience that works harder for your business.
            </h2>
            <Link
              href="/contact"
              className="btn-primary mt-6 inline-flex min-h-[50px] items-center justify-center px-8 py-3 text-sm font-black"
            >
              Get Free Consultation
            </Link>
          </div>
        </motion.section>
      </main>

    </>
  )
}