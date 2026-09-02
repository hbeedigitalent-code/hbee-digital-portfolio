import { createClient } from '@supabase/supabase-js'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hbeedigitals.com'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

function absoluteUrl(url?: string | null) {
  if (!url) return `${siteUrl}/og-default.jpg`
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return `${siteUrl}${url}`
  return url
}

export default async function Head({ params }: { params: { slug: string } }) {
  let post: any = null

  if (supabase) {
    const { data } = await supabase
      .from('blog_posts')
      .select(
        'title, excerpt, slug, seo_title, seo_description, og_title, og_description, og_image, featured_image, canonical_url'
      )
      .eq('slug', params.slug)
      .eq('status', 'published')
      .single()

    post = data
  }

  const title = post?.seo_title || post?.og_title || post?.title || 'Hbee Digitals Blog'
  const description =
    post?.seo_description ||
    post?.og_description ||
    post?.excerpt ||
    'Practical ecommerce growth, conversion optimization, and digital strategy insights from Hbee Digitals.'

  const image = absoluteUrl(post?.og_image || post?.featured_image)
  const canonical = post?.canonical_url || `${siteUrl}/blog/${params.slug}`

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content="article" />
      <meta property="og:title" content={post?.og_title || title} />
      <meta property="og:description" content={post?.og_description || description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={post?.og_title || title} />
      <meta name="twitter:description" content={post?.og_description || description} />
      <meta name="twitter:image" content={image} />
    </>
  )
}