'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

export type BlogCardPost = {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  featured_image?: string | null
  featured_image_alt?: string | null
  tags?: string[] | null
  author?: string | null
  status?: string | null
  is_featured?: boolean | null
  featured_badge?: string | null
  read_time?: string | null
  published_at?: string | null
  created_at?: string | null
}

function formatDate(date?: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function BlogIndexClient({ posts }: { posts: BlogCardPost[] }) {
  const reducedMotion = useReducedMotion()
  const [activeTag, setActiveTag] = useState('All')
  const isFiltered = activeTag !== 'All'

  // Tag frequency, computed from the already-provided posts — no extra query.
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const post of posts) {
      for (const tag of post.tags || []) {
        counts.set(tag, (counts.get(tag) || 0) + 1)
      }
    }
    return counts
  }, [posts])

  const tags = useMemo(() => {
    // Preserve the original first-seen ordering; counts are shown alongside.
    const allTags = posts.flatMap((post) => post.tags || [])
    return ['All', ...Array.from(new Set(allTags)).slice(0, 10)]
  }, [posts])

  const filteredPosts = useMemo(() => {
    if (activeTag === 'All') return posts
    return posts.filter((post) => post.tags?.includes(activeTag))
  }, [posts, activeTag])

  const featuredPost = useMemo(() => {
    return filteredPosts.find((post) => post.is_featured) || filteredPosts[0]
  }, [filteredPosts])

  const latestPosts = useMemo(() => {
    return filteredPosts.filter((post) => post.id !== featuredPost?.id)
  }, [filteredPosts, featuredPost])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <>

      <main className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] pt-28">
        {/* Hero */}
        <section className="relative overflow-hidden px-5 pb-12 sm:px-6 md:px-10 lg:px-12">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--accent)]/5 to-transparent" />

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1">
              <SvgIcon name="blog" size={14} color="var(--accent)" />
              <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                Hbee Insights
              </span>
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-[-0.02em] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              Practical ecommerce <span className="text-[var(--accent)]">growth insights</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
              Strategy articles on ecommerce, Shopify, conversion optimization,
              customer trust, brand positioning, and digital systems built for growth.
            </p>

            {tags.length > 1 && (
              <div
                role="group"
                aria-label="Filter articles by topic"
                className="mt-8 flex flex-wrap justify-center gap-2"
              >
                {tags.map((tag) => {
                  const active = activeTag === tag
                  const count = tag === 'All' ? posts.length : tagCounts.get(tag) || 0
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setActiveTag(tag)}
                      aria-pressed={active}
                      aria-label={
                        tag === 'All'
                          ? `All topics, ${count} articles`
                          : `${tag}, ${count} ${count === 1 ? 'article' : 'articles'}`
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] ${
                        active
                          ? 'bg-[var(--accent)] text-white'
                          : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                      }`}
                    >
                      {tag}
                      <span
                        aria-hidden="true"
                        className={
                          active ? 'text-white/70' : 'text-[var(--text-muted)]'
                        }
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {isFiltered && (
              <div
                aria-live="polite"
                className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-[var(--text-secondary)]"
              >
                <span>
                  {filteredPosts.length}{' '}
                  {filteredPosts.length === 1 ? 'article' : 'articles'} tagged{' '}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {activeTag}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTag('All')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
                >
                  <SvgIcon name="x-close" size={12} color="currentColor" />
                  Clear filter
                </button>
              </div>
            )}
          </div>
        </section>

        {filteredPosts.length === 0 ? (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-20 text-center">
              <SvgIcon name="blog" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
              {isFiltered ? (
                <>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    No articles tagged “{activeTag}”.
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTag('All')}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
                  >
                    <SvgIcon name="x-close" size={12} color="currentColor" />
                    Clear filter
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">No published articles yet.</h2>
                  <p className="mt-3 text-[var(--text-muted)]">
                    Publish a new blog post from the admin dashboard and it will appear here.
                  </p>
                </>
              )}
            </div>
          </section>
        ) : (
          <>
            {/* Featured Post */}
            {featuredPost && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="px-5 pt-10 pb-6 sm:px-6 md:px-10 lg:px-12"
              >
                <div className="mx-auto max-w-[1080px]">
                  <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                        {isFiltered ? `Top in ${activeTag}` : 'Featured'}
                      </span>
                      <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-3xl">
                        {isFiltered ? 'Start here' : 'Featured article'}
                      </h2>
                    </div>
                    <Link
                      href={`/blog/${featuredPost.slug}`}
                      className="group inline-flex shrink-0 items-center gap-2 rounded-md text-sm font-semibold text-[var(--accent)] transition-all hover:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
                    >
                      Read article
                      <SvgIcon name="arrow-right" size={14} color="var(--accent)" />
                    </Link>
                  </div>

                  <BlogCard post={featuredPost} featured />
                </div>
              </motion.section>
            )}

            {/* Latest Articles */}
            <motion.section
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="px-5 py-12 sm:px-6 md:px-10 lg:px-12"
            >
              <div className="mx-auto max-w-[1080px]">
                <div className="mb-8">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                    {isFiltered ? activeTag : 'The archive'}
                  </span>
                  <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-3xl">
                    {isFiltered ? 'More on this topic' : 'Latest articles'}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {isFiltered
                      ? `Every published article tagged ${activeTag}.`
                      : 'Fresh insights to help you improve trust, conversion, and digital growth.'}
                  </p>
                </div>

                {latestPosts.length > 0 ? (
                  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {latestPosts.map((post, index) => (
                      <motion.div key={post.id} variants={itemVariants}>
                        <BlogCard post={post} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
                    <SvgIcon name="blog" size={32} color="var(--text-muted)" className="mx-auto mb-4" />
                    <p className="text-[var(--text-muted)]">
                      No other articles yet. Publish another post to fill this section.
                    </p>
                  </div>
                )}
              </div>
            </motion.section>
          </>
        )}

        {/* CTA */}
        <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-[1080px] rounded-2xl border border-[var(--accent)]/20 bg-[var(--bg-navy)] p-8 text-center sm:p-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-4 py-2">
              <SvgIcon name="growth" size={14} color="var(--accent)" />
              <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                Ready to Scale?
              </span>
            </div>

            <h2 className="mx-auto max-w-2xl text-2xl sm:text-3xl font-bold text-white">
              Turn ecommerce insights into measurable growth
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--text-on-dark-muted)] sm:text-base">
              Let&apos;s review your website, customer journey, trust signals, and growth
              opportunities so your brand can convert better.
            </p>

            <div className="mt-8">
              <Button href="/contact" variant="cta" size="lg">
                Request a Growth Review
                <SvgIcon name="arrow-right" size={16} color="white" />
              </Button>
            </div>
          </div>
        </section>
      </main>

    </>
  )
}

function BlogCard({ post, featured = false }: { post: BlogCardPost; featured?: boolean }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
    >
      <article
        className={`flex h-full flex-col overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-lg)] ${
          featured ? 'rounded-2xl' : 'rounded-xl'
        }`}
      >
        <div className="aspect-[1200/630] overflow-hidden bg-[var(--bg-section)]">
          {post.featured_image ? (
            <img
              src={post.featured_image}
              alt={post.featured_image_alt || post.title}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <SvgIcon name="blog" size={40} color="var(--text-muted)" />
            </div>
          )}
        </div>

        <div className={featured ? 'p-6 sm:p-8' : 'flex flex-1 flex-col p-5'}>
          <div className="mb-4 flex flex-wrap gap-2">
            {post.is_featured && (
              <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                {post.featured_badge || 'Featured'}
              </span>
            )}

            {post.tags?.slice(0, featured ? 4 : 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent)]"
              >
                {tag}
              </span>
            ))}
          </div>

          <h3
            className={`font-bold leading-tight tracking-[-0.02em] text-[var(--text-primary)] transition group-hover:text-[var(--accent)] ${
              featured ? 'text-2xl sm:text-3xl' : 'text-xl'
            }`}
          >
            {post.title}
          </h3>

          {post.excerpt && (
            <p
              className={`mt-4 text-[var(--text-secondary)] ${
                featured ? 'max-w-3xl text-base leading-8' : 'line-clamp-3 text-sm leading-7'
              }`}
            >
              {post.excerpt}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-4 pt-6 text-xs text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text-primary)]">
              {post.author || 'Hbee Digitals'}
            </span>

            <span className="flex items-center gap-1.5">
              <SvgIcon name="calendar" size={12} color="var(--text-muted)" />
              {formatDate(post.published_at || post.created_at)}
            </span>

            {post.read_time && (
              <span className="flex items-center gap-1.5">
                <SvgIcon name="clock" size={12} color="var(--text-muted)" />
                {post.read_time}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
