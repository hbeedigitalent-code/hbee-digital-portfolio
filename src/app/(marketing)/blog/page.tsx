import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/blog-utils'
import BlogIndexClient, { type BlogCardPost } from './BlogIndexClient'

export const revalidate = 60

// Root layout applies the `%s | Hbee Digitals` title template, so `title` here
// stays brand-free; OG/Twitter titles include the brand explicitly.
const pageTitle = 'Ecommerce Growth Insights & Blog'
const socialTitle = 'Ecommerce Growth Insights & Blog | Hbee Digitals'
const pageDescription =
  'Practical articles on ecommerce, Shopify, conversion optimization, customer trust, brand positioning, and digital systems built for growth.'
const canonicalUrl = `${SITE_URL}/blog`
const ogImage = `${SITE_URL}${DEFAULT_OG_IMAGE}`

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: socialTitle,
    description: pageDescription,
    url: canonicalUrl,
    siteName: 'Hbee Digitals',
    type: 'website',
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'Hbee Digitals — Ecommerce Growth Insights',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: socialTitle,
    description: pageDescription,
    images: [ogImage],
  },
}

// Card fields only — never select the full article `content` for the index.
const CARD_FIELDS =
  'id, title, slug, excerpt, featured_image, featured_image_alt, tags, author, is_featured, featured_badge, read_time, published_at, created_at'

async function getPublishedPosts(): Promise<BlogCardPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(CARD_FIELDS)
      .eq('status', 'published')
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Blog index fetch error:', error)
      return []
    }

    return (data as BlogCardPost[]) || []
  } catch {
    return []
  }
}

export default async function BlogPage() {
  const posts = await getPublishedPosts()
  return <BlogIndexClient posts={posts} />
}
