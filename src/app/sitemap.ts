import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

const baseUrl = 'https://hbeedigitals.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    { route: '', priority: 1, changeFrequency: 'weekly' as const },

    { route: '/about', priority: 0.85, changeFrequency: 'monthly' as const },

    { route: '/services', priority: 0.9, changeFrequency: 'monthly' as const },

    { route: '/pricing', priority: 0.88, changeFrequency: 'monthly' as const },

    { route: '/portfolio', priority: 0.88, changeFrequency: 'monthly' as const },

    {
      route: '/before-after',
      priority: 0.82,
      changeFrequency: 'monthly' as const,
    },

    { route: '/process', priority: 0.75, changeFrequency: 'monthly' as const },

    { route: '/blog', priority: 0.82, changeFrequency: 'weekly' as const },

    { route: '/reviews', priority: 0.82, changeFrequency: 'monthly' as const },

    { route: '/faq', priority: 0.72, changeFrequency: 'monthly' as const },

    { route: '/contact', priority: 0.9, changeFrequency: 'monthly' as const },

    { route: '/privacy', priority: 0.35, changeFrequency: 'yearly' as const },

    { route: '/terms', priority: 0.35, changeFrequency: 'yearly' as const },

    { route: '/cookies', priority: 0.35, changeFrequency: 'yearly' as const },
  ]

  const [{ data: portfolioItems }, { data: services }, { data: blogPosts }] =
    await Promise.all([
      supabase
        .from('portfolio_items')
        .select('slug')
        .eq('is_active', true),

      supabase
        .from('services')
        .select('slug')
        .eq('is_active', true),

      supabase
        .from('blog_posts')
        .select('slug, updated_at, published_at')
        .eq('status', 'published'),
    ])

  const portfolioRoutes =
    portfolioItems
      ?.filter((item) => item.slug)
      .map((item) => ({
        url: `${baseUrl}/portfolio/${item.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.85,
      })) || []

  const serviceRoutes =
    services
      ?.filter((service) => service.slug)
      .map((service) => ({
        url: `${baseUrl}/services/${service.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.84,
      })) || []

  const blogRoutes =
    blogPosts
      ?.filter((post) => post.slug)
      .map((post) => {
        // Real modification date only: updated_at, then published_at. If neither
        // exists, omit lastModified rather than emit the crawl time as a fake date.
        const lastMod = post.updated_at || post.published_at
        return {
          url: `${baseUrl}/blog/${post.slug}`,
          ...(lastMod ? { lastModified: new Date(lastMod) } : {}),
          changeFrequency: 'weekly' as const,
          priority: 0.78,
        }
      }) || []

  return [
    ...staticRoutes.map((item) => ({
      url: `${baseUrl}${item.route}`,
      lastModified: new Date(),
      changeFrequency: item.changeFrequency,
      priority: item.priority,
    })),

    ...serviceRoutes,
    ...portfolioRoutes,
    ...blogRoutes,
  ]
}