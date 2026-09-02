import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  cleanBlogHtml,
  addHeadingIds,
  absoluteUrl,
  estimateReadTime,
  SITE_URL,
} from '@/lib/blog-utils'
import { sanitizeBlogHtml } from '@/lib/sanitize-blog-html'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'
import BlogTableOfContents from '@/components/blog/BlogTableOfContents'
import BlogAuthorBio from '@/components/blog/BlogAuthorBio'
import BlogReadingProgress from '@/components/blog/BlogReadingProgress'
import BlogReadingTools from '@/components/blog/BlogReadingTools'
import BlogNewsletterSignup from '@/components/blog/BlogNewsletterSignup'
import RelatedPosts, { type RelatedPost } from '@/components/blog/RelatedPosts'
import BlogComments from '@/components/blog/BlogComments'
import '@/styles/blog-content.css'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  featured_image: string | null
  featured_image_alt: string | null
  tags: string[] | null
  author: string | null
  status: string
  is_featured: boolean
  featured_badge: string | null
  read_time: string | null
  published_at: string | null
  updated_at: string | null
  seo_title: string | null
  seo_description: string | null
  og_title: string | null
  og_description: string | null
  og_image: string | null
  canonical_url: string | null
  focus_keyword: string | null
  cta_text: string | null
  cta_link: string | null
}

const RELATED_FIELDS =
  'id, title, slug, excerpt, featured_image, featured_image_alt, tags, author, published_at, read_time'

/**
 * Explicit, conservative tag -> existing marketing route map for the single
 * "related service" link under the article CTA. Keys are matched case-insensitively
 * against the post's own tags; every destination is a stable top-level route that
 * already exists. No fabricated relevance — if a post has no matching tag, no
 * service link is shown.
 */
const TAG_SERVICE_LINKS: { match: string; label: string; href: string }[] = [
  { match: 'conversion', label: 'Conversion optimization services', href: '/services' },
  { match: 'shopify', label: 'Shopify growth services', href: '/services' },
  { match: 'seo', label: 'SEO & growth services', href: '/services' },
  { match: 'brand', label: 'Brand & positioning services', href: '/services' },
  { match: 'ecommerce', label: 'Ecommerce growth services', href: '/services' },
  { match: 'growth', label: 'Growth services', href: '/services' },
]

function relatedServiceLink(tags: string[] | null) {
  const lowered = (tags || []).map((t) => t.toLowerCase())
  return (
    TAG_SERVICE_LINKS.find((entry) =>
      lowered.some((tag) => tag.includes(entry.match)),
    ) || null
  )
}

export const revalidate = 300

// Deduplicate the query: generateMetadata() and the page render call this in the
// same request; React.cache() ensures a single DB round-trip.
const getBlogPost = cache(async (slug: string): Promise<BlogPost | null> => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return data
  } catch {
    return null
  }
})

/** Server-side related-posts fetch (mirrors the client-side two-tier logic). */
const getRelatedPosts = cache(
  async (currentSlug: string, tags: string[] | null): Promise<RelatedPost[]> => {
    try {
      let query = supabase
        .from('blog_posts')
        .select(RELATED_FIELDS)
        .eq('status', 'published')
        .neq('slug', currentSlug)
        .order('published_at', { ascending: false })
        .limit(3)

      if (tags && tags.length > 0) {
        query = query.overlaps('tags', tags)
      }

      const { data } = await query
      if (data && data.length > 0) return data as RelatedPost[]

      const { data: fallback } = await supabase
        .from('blog_posts')
        .select(RELATED_FIELDS)
        .eq('status', 'published')
        .neq('slug', currentSlug)
        .order('published_at', { ascending: false })
        .limit(3)

      return (fallback as RelatedPost[]) || []
    } catch {
      return []
    }
  },
)

/** Deduplicated keyword list from the article's focus keyword + tags. */
function articleKeywords(post: BlogPost): string[] {
  return Array.from(
    new Set(
      [post.focus_keyword, ...(post.tags || [])]
        .map((k) => (k || '').trim())
        .filter(Boolean),
    ),
  )
}

function articleCanonical(post: BlogPost): string {
  return post.canonical_url || `${SITE_URL}/blog/${post.slug}`
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = await getBlogPost(params.slug)

  if (!post) {
    // Next injects its own noindex for the not-found boundary; clear the root
    // layout's inherited `index: true` so only that single directive remains.
    return {
      title: 'Article Not Found',
      robots: null,
    }
  }

  const title = post.seo_title || post.og_title || post.title
  const description =
    post.seo_description || post.og_description || post.excerpt?.slice(0, 160) || ''
  const ogImage = absoluteUrl(post.og_image || post.featured_image)
  const canonical = articleCanonical(post)
  const keywords = articleKeywords(post)
  const authorName = post.author || 'Hbee Digitals'

  return {
    // Root layout applies the `%s | Hbee Digitals` template — keep this brand-free.
    title,
    description,
    authors: [{ name: authorName }],
    creator: authorName,
    keywords: keywords.length > 0 ? keywords : undefined,
    alternates: {
      canonical,
    },
    openGraph: {
      title: post.og_title || title,
      description: post.og_description || description,
      url: canonical,
      siteName: 'Hbee Digitals',
      type: 'article',
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || undefined,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.featured_image_alt || post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.og_title || title,
      description: post.og_description || description,
      images: [ogImage],
    },
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getBlogPost(params.slug)

  if (!post) {
    notFound()
  }

  // Pipeline order matters: structural cleanup -> allowlist sanitization ->
  // heading-id injection. Sanitizing before addHeadingIds() keeps the
  // server-generated TOC ids on markup that is already safe for
  // dangerouslySetInnerHTML.
  const { html: cleanedContent, toc } = addHeadingIds(
    sanitizeBlogHtml(cleanBlogHtml(post.content)),
  )

  const relatedPosts = await getRelatedPosts(post.slug, post.tags)

  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const formattedUpdateDate = post.updated_at
    ? new Date(post.updated_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  // Manually stored read time wins; otherwise estimate from the article body.
  const readTime = post.read_time?.trim() || estimateReadTime(post.content)

  // Per-article CTA — only when BOTH the label and link are populated.
  const hasCustomCta = Boolean(post.cta_text?.trim() && post.cta_link?.trim())
  const ctaText = hasCustomCta ? post.cta_text!.trim() : 'Request a Growth Review'
  const ctaLink = hasCustomCta ? post.cta_link!.trim() : '/contact'
  const ctaEyebrow = hasCustomCta ? 'Recommended next step' : 'Need help improving your store?'
  const ctaHeadline = hasCustomCta
    ? `Keep going: apply what this article covers with help from Hbee Digitals.`
    : 'Hbee Digitals helps businesses improve trust, user experience, conversion flow, and growth systems that turn visitors into customers.'
  const serviceLink = relatedServiceLink(post.tags)

  const canonical = articleCanonical(post)
  const seoTitle = post.seo_title || post.og_title || post.title
  const seoDescription =
    post.seo_description || post.og_description || post.excerpt?.slice(0, 160) || ''
  const articleImage = absoluteUrl(post.og_image || post.featured_image)
  const keywords = articleKeywords(post)

  const blogPostingLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: seoTitle.slice(0, 110),
    description: seoDescription || undefined,
    image: [articleImage],
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    author: { '@type': 'Person', name: post.author || 'Hbee Digitals' },
    publisher: { '@type': 'Organization', name: 'Hbee Digitals', url: SITE_URL },
    keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
    ],
  }

  // Escape `<` so post-authored strings can't break out of the <script> tag.
  const ldJson = (obj: unknown) => JSON.stringify(obj).replace(/</g, '\\u003c')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(blogPostingLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbLd) }}
      />

      <BlogReadingProgress />

      <main className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] pt-28">
        <article className="mx-auto max-w-[980px] px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[var(--text-muted)]"
          >
            <Link
              href="/"
              className="rounded transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
            >
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/blog"
              className="rounded transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
            >
              Blog
            </Link>
            <span aria-hidden="true">/</span>
            <span className="line-clamp-1 text-[var(--text-secondary)]" aria-current="page">
              {post.title}
            </span>
          </nav>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="max-w-[860px] text-3xl font-black tracking-[-0.02em] text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="mt-5 max-w-[760px] text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
              {post.excerpt}
            </p>
          )}

          {/* Author & Reading Tools */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <BlogAuthorBio
              author={post.author || 'Hbee Digitals'}
              date={formattedUpdateDate || formattedDate || undefined}
              readTime={readTime}
            />

            <BlogReadingTools title={post.title} />
          </div>

          {/* Featured Image */}
          {post.featured_image && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-section)]">
              <img
                src={post.featured_image}
                alt={post.featured_image_alt || post.title}
                className="aspect-[1200/630] h-full w-full object-cover"
                loading="eager"
              />
            </div>
          )}

          {/* Content */}
          <div className="mt-10">
            <BlogTableOfContents content={cleanedContent} toc={toc} />

            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: cleanedContent }}
            />

            <BlogNewsletterSignup />
            <BlogComments postSlug={post.slug} />
            <RelatedPosts
              currentSlug={post.slug}
              tags={post.tags}
              initialPosts={relatedPosts}
            />
          </div>
        </article>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-[980px] px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--bg-navy)] p-8 text-center sm:p-14">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-4 py-2">
              <SvgIcon name="growth" size={14} color="var(--accent)" />
              <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                {ctaEyebrow}
              </span>
            </div>

            <h2 className="mx-auto max-w-2xl text-2xl font-bold tracking-[-0.02em] text-white sm:text-3xl">
              {ctaHeadline}
            </h2>

            <div className="mt-8">
              <Button href={ctaLink} variant="cta" size="lg">
                {ctaText}
                <SvgIcon name="arrow-right" size={16} color="white" />
              </Button>
            </div>

            {serviceLink && (
              <p className="mt-5 text-sm text-[var(--text-on-dark-muted)]">
                Related:{' '}
                <Link
                  href={serviceLink.href}
                  className="font-semibold text-[var(--accent)] underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-navy)]"
                >
                  {serviceLink.label}
                </Link>
              </p>
            )}
          </div>
        </section>
      </main>

    </>
  )
}