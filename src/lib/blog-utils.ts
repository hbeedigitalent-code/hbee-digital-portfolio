/**
 * Blog HTML Cleaning Utilities
 * 
 * These functions clean raw HTML content from the admin editor
 * so it renders properly on the public blog pages.
 */

export function decodeHtml(value: string): string {
  if (typeof window === 'undefined') return value

  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

export function cleanBlogHtml(raw: string): string {
  if (!raw) return '<p>Content coming soon...</p>'

  let html = raw.trim()

  // Remove markdown code fences
  html = html
    .replace(/^```html/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim()

  // Decode entity-encoded markup from some editors (no-op on the server, where
  // `decodeHtml` bails without a DOM). Safe here only because the render pipeline
  // runs sanitizeBlogHtml() *after* cleanBlogHtml() — never decode entities after
  // sanitizing, or an escaped `&lt;script&gt;` becomes executable again.
  if (html.includes('&lt;') || html.includes('&gt;')) {
    html = decodeHtml(html)
  }

  // Light structural cleanup of editor/generation artifacts. NOTE: this is not a
  // security step — sanitizeBlogHtml() (allowlist parser) does that afterwards.
  // <pre>/<code> are intentionally left intact so real code samples survive, and
  // prose containing "..." is left alone; only placeholder-only paragraphs go.
  html = html
    .replace(/<article[^>]*>/gi, '')
    .replace(/<\/article>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<section[^>]*>/gi, '')
    .replace(/<\/section>/gi, '')
    .replace(/<p[^>]*>\s*\.\.\.\s*<\/p>/gi, '')
    .replace(/^\s*\.\.\.\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return html
}

/**
 * Generate table of contents from HTML content
 * Extracts h2 and h3 elements
 */
export function generateToc(html: string): Array<{ id: string; text: string; level: number }> {
  if (!html) return []

  const toc: Array<{ id: string; text: string; level: number }> = []
  const headingRegex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi
  let match

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10)
    // Strip any HTML tags from the heading text
    const text = match[2].replace(/<[^>]+>/g, '').trim()
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60)

    toc.push({ id, text, level })
  }

  return toc
}

export interface TocHeading {
  id: string
  text: string
  level: number
}

/**
 * Adds a stable `id` to every <h2>/<h3> in the article HTML (server-side) and
 * returns the matching table-of-contents entries. Author-provided ids are kept;
 * generated slugs are de-duplicated. Only the heading opening tag is touched —
 * inner markup and all other elements are left untouched.
 */
export function addHeadingIds(html: string): { html: string; toc: TocHeading[] } {
  if (!html) return { html: html || '', toc: [] }

  const toc: TocHeading[] = []
  const used = new Set<string>()

  const out = html.replace(
    /<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (full: string, tag: string, attrs: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, '').trim()
      if (!text) return full

      const level = tag.toLowerCase() === 'h2' ? 2 : 3
      const existing = /\bid=["']([^"']+)["']/i.exec(attrs)?.[1]

      let id = existing || slugify(text) || `section-${toc.length + 1}`
      if (!existing) {
        const base = id
        let n = 2
        while (used.has(id)) id = `${base}-${n++}`
      }
      used.add(id)
      toc.push({ id, text, level })

      return existing ? full : `<${tag}${attrs} id="${id}">${inner}</${tag}>`
    },
  )

  return { html: out, toc }
}

/**
 * Auto-estimate read time from HTML content
 * Average reading speed: 200 words per minute
 */
export function estimateReadTime(html: string): string {
  if (!html) return '3 min'

  // Strip HTML tags to count words
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const wordCount = text.split(' ').filter((word) => word.length > 0).length
  const minutes = Math.ceil(wordCount / 200)

  return `${minutes} min read`
}

/**
 * Ensure a slug is URL-friendly
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Canonical production origin — apex, no `www`. Single source of truth for
 * blog absolute URLs (matches `src/app/layout.tsx`, `sitemap.ts`, `robots.ts`).
 */
export const SITE_URL = 'https://hbeedigitals.com'

/**
 * Default social-preview image used when a post has no `og_image` / `featured_image`.
 * Real asset: /public/svgs/og-image.jpg (3264×1713, 1.91:1 — correct OG ratio).
 */
export const DEFAULT_OG_IMAGE = '/svgs/og-image.jpg'

/**
 * Absolute URL helper for OG images. Uses the one apex `SITE_URL`; never falls
 * back to a 404 path.
 */
export function absoluteUrl(path?: string | null): string {
  if (!path) return `${SITE_URL}${DEFAULT_OG_IMAGE}`
  if (path.startsWith('http')) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}