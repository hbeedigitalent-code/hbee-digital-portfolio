/**
 * Server-side HTML sanitizer for blog article bodies.
 *
 * This module runs ONLY in the Node server runtime — it is imported exclusively
 * by the `/blog/[slug]` server component, before the article HTML is handed to
 * `dangerouslySetInnerHTML`. It is deliberately kept out of `blog-utils.ts`
 * because that file is also imported by the client `BlogPostEditor`, and
 * `sanitize-html` (htmlparser2 + postcss) must not be pulled into a client bundle.
 *
 * `sanitize-html` uses a real streaming HTML parser (htmlparser2), not regex, to
 * enforce an explicit tag/attribute allowlist. Anything outside the allowlist is
 * dropped; `<script>`, `<iframe>`, `<object>`, `<embed>`, `<noscript>` also have
 * their contents discarded. Unsafe URL schemes (`javascript:`, `data:`,
 * `vbscript:`, …) are rejected because only `http/https/mailto/tel` are allowed.
 */
import sanitizeHtml from 'sanitize-html'

/**
 * Elements the current published articles and the design system rely on.
 * Headings stay so the server-generated table of contents keeps working.
 */
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'ul', 'ol', 'li',
  'a', 'img',
  'blockquote', 'strong', 'em', 'b', 'i', 'u', 's',
  'code', 'pre', 'br', 'hr',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'figure', 'figcaption', 'span', 'div',
]

const INTERNAL_HOSTS = new Set(['hbeedigitals.com', 'www.hbeedigitals.com'])

/** Same-site links (including relative / anchor links) are treated as internal. */
function isInternalHref(href: string): boolean {
  try {
    return INTERNAL_HOSTS.has(
      new URL(href, 'https://hbeedigitals.com').hostname.toLowerCase(),
    )
  } catch {
    return true
  }
}

/**
 * `sanitize-html`'s scheme allowlist only filters URLs that *have* a scheme, so
 * schemeless / relative / protocol-relative `src` values slip through. The
 * current published articles use no inline images, so image sources are
 * restricted to fully-qualified http(s) URLs: parsed with the WHATWG URL API
 * (no base), anything that is not `http:`/`https:` — relative paths, `//host`,
 * `javascript:`, `data:`, `vbscript:`, `file:` — yields no usable src.
 */
function safeImageSrc(src: string): string | undefined {
  try {
    const { protocol } = new URL(src)
    return protocol === 'http:' || protocol === 'https:' ? src : undefined
  } catch {
    return undefined
  }
}

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'title', 'id', 'class'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'id', 'class'],
    th: ['colspan', 'rowspan', 'scope', 'id', 'class'],
    td: ['colspan', 'rowspan', 'id', 'class'],
    // Every other allowed element may carry only id / class.
    '*': ['id', 'class'],
  },
  // Only these schemes may appear in href / src. Everything else (javascript:,
  // data:, vbscript:, file:, about:, protocol-relative …) is stripped.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  // Drop the *contents* of these, not just the tags.
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe', 'object', 'embed'],
  // We never allow the style attribute, so skip the postcss-backed style parser.
  parseStyleAttributes: false,
  transformTags: {
    img: (tagName, attribs) => {
      const attrs: sanitizeHtml.Attributes = { ...attribs }
      const src = safeImageSrc((attrs.src || '').trim())
      if (src) attrs.src = src
      else delete attrs.src
      return { tagName, attribs: attrs }
    },
    a: (tagName, attribs) => {
      const attrs: sanitizeHtml.Attributes = { ...attribs }
      const href = (attrs.href || '').trim()

      if (href && !href.startsWith('#')) {
        if (isInternalHref(href)) {
          // Preserve author intent; just make new-tab links safe.
          if (attrs.target === '_blank') attrs.rel = 'noopener noreferrer'
        } else {
          attrs.target = '_blank'
          attrs.rel = 'noopener noreferrer nofollow'
        }
      }

      return { tagName, attribs: attrs }
    },
  },
}

/**
 * Sanitize raw article HTML against the allowlist above. Call this BEFORE
 * `addHeadingIds()` so heading ids are injected into already-clean markup, and
 * never decode HTML entities on the result (that would turn an escaped
 * `&lt;script&gt;` back into executable markup).
 */
export function sanitizeBlogHtml(html: string): string {
  if (!html) return ''
  return sanitizeHtml(html, OPTIONS)
}
