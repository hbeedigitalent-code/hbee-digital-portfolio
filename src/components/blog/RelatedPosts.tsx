'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

export interface RelatedPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featured_image: string | null
  featured_image_alt?: string | null
  tags: string[] | null
  author: string | null
  published_at: string | null
  read_time: string | null
}

interface RelatedPostsProps {
  currentSlug: string
  tags?: string[] | null
  /** When provided (server-prefetched), the client-side query is skipped. */
  initialPosts?: RelatedPost[]
}

function formatDate(date?: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

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

export default function RelatedPosts({ currentSlug, tags, initialPosts }: RelatedPostsProps) {
  const [posts, setPosts] = useState<RelatedPost[]>(initialPosts ?? [])
  const [loading, setLoading] = useState(!initialPosts)

  useEffect(() => {
    // Server already prefetched — do not fire a duplicate client-side query.
    if (initialPosts) return

    async function fetchRelated() {
      setLoading(true)

      let query = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, featured_image, featured_image_alt, tags, author, published_at, read_time')
        .eq('status', 'published')
        .neq('slug', currentSlug)
        .order('published_at', { ascending: false })
        .limit(3)

      if (tags && tags.length > 0) {
        query = query.overlaps('tags', tags)
      }

      const { data, error } = await query

      if (error || !data || data.length === 0) {
        const { data: fallbackData } = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, featured_image, featured_image_alt, tags, author, published_at, read_time')
          .eq('status', 'published')
          .neq('slug', currentSlug)
          .order('published_at', { ascending: false })
          .limit(3)

        setPosts(fallbackData || [])
      } else {
        setPosts(data)
      }

      setLoading(false)
    }

    fetchRelated()
  }, [currentSlug, tags, initialPosts])

  if (loading) {
    return (
      <section className="mt-16">
        <h3 className="mb-6 text-xl font-bold text-[var(--text-primary)]">
          Related Articles
        </h3>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-64 animate-pulse rounded-2xl bg-[var(--bg-card)]" />
          ))}
        </div>
      </section>
    )
  }

  if (posts.length === 0) return null

  return (
    <section className="mt-16">
      <h3 className="mb-6 flex items-center gap-2 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
        <SvgIcon name="blog" size={20} color="var(--accent)" />
        Related Articles
      </h3>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 md:grid-cols-3"
      >
        {posts.map((post) => (
          <motion.div key={post.id} variants={itemVariants}>
            <Link
              href={`/blog/${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
            >
              <div className="aspect-[1200/630] overflow-hidden bg-[var(--bg-section)]">
                {post.featured_image ? (
                  <img
                    src={post.featured_image}
                    alt={post.featured_image_alt || post.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <SvgIcon name="blog" size={32} color="var(--text-muted)" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-5">
                {post.tags && post.tags.length > 0 && (
                  <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                    {post.tags[0]}
                  </span>
                )}

                <h4 className="line-clamp-2 text-base font-bold leading-snug text-[var(--text-primary)] transition group-hover:text-[var(--accent)]">
                  {post.title}
                </h4>

                {post.excerpt && (
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {post.excerpt}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-3 pt-4 text-xs text-[var(--text-muted)]">
                  <span>{post.author || 'Hbee Digitals'}</span>
                  <span>{formatDate(post.published_at)}</span>
                  {post.read_time && (
                    <span className="flex items-center gap-1">
                      <SvgIcon name="clock" size={12} color="var(--text-muted)" />
                      {post.read_time}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}