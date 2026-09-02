'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/blog-utils'

type InitialPost = {
  id?: string
  title?: string
  slug?: string
  excerpt?: string
  content?: string
  featured_image?: string
  featured_image_alt?: string
  alt_text?: string
  author?: string
  tags?: string[]
  status?: string
  is_featured?: boolean
  featured_badge?: string
  seo_title?: string
  seo_description?: string
  focus_keyword?: string
  og_title?: string
  og_description?: string
  og_image?: string
  canonical_url?: string
  read_time?: string
  cta_text?: string
  cta_link?: string
  published_at?: string | null
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function toAbsoluteUrl(url: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return `${SITE_URL}${url}`
  return url
}

function estimateReadTime(html: string) {
  const text = html.replace(/<[^>]+>/g, ' ')
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.ceil(words / 220))} min read`
}

export default function BlogPostEditor({
  mode,
  initialPost,
}: {
  mode: 'new' | 'edit'
  initialPost?: InitialPost
}) {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [title, setTitle] = useState(initialPost?.title || '')
  const [slug, setSlug] = useState(initialPost?.slug || '')
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || '')
  const [content, setContent] = useState(initialPost?.content || '')
  const [featuredImage, setFeaturedImage] = useState(initialPost?.featured_image || '')
  const [featuredImageAlt, setFeaturedImageAlt] = useState(
    initialPost?.featured_image_alt || initialPost?.alt_text || ''
  )
  const [author, setAuthor] = useState(initialPost?.author || 'Habeeb Ismaila')
  const [tags, setTags] = useState(initialPost?.tags?.join(', ') || 'Ecommerce, Growth Strategy')
  const [status, setStatus] = useState(initialPost?.status || 'draft')
  const [isFeatured, setIsFeatured] = useState(Boolean(initialPost?.is_featured))
  const [featuredBadge, setFeaturedBadge] = useState(initialPost?.featured_badge || 'Featured Insight')

  const [seoTitle, setSeoTitle] = useState(initialPost?.seo_title || '')
  const [seoDescription, setSeoDescription] = useState(initialPost?.seo_description || '')
  const [focusKeyword, setFocusKeyword] = useState(initialPost?.focus_keyword || '')
  const [ogTitle, setOgTitle] = useState(initialPost?.og_title || '')
  const [ogDescription, setOgDescription] = useState(initialPost?.og_description || '')
  const [ogImage, setOgImage] = useState(initialPost?.og_image || '')
  const [canonicalUrl, setCanonicalUrl] = useState(initialPost?.canonical_url || '')

  const [readTimeInput, setReadTimeInput] = useState(initialPost?.read_time || '')
  const [ctaText, setCtaText] = useState(initialPost?.cta_text || '')
  const [ctaLink, setCtaLink] = useState(initialPost?.cta_link || '')

  const finalSlug = useMemo(() => slug || slugify(title), [slug, title])
  const finalFeaturedImage = useMemo(() => toAbsoluteUrl(featuredImage), [featuredImage])
  const readTime = useMemo(() => estimateReadTime(content), [content])
  const finalReadTime = readTimeInput.trim() || readTime

  function insertSnippet(snippet: string) {
    setContent((prev) => `${prev}\n\n${snippet}`)
  }

  async function uploadFeaturedImage(file: File) {
    try {
      setUploading(true)

      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${slugify(file.name.replace(`.${ext}`, ''))}.${ext}`

      const { error } = await supabase.storage
        .from('blog-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        alert(error.message)
        setUploading(false)
        return
      }

      const { data } = supabase.storage.from('blog-images').getPublicUrl(fileName)

      setFeaturedImage(data.publicUrl)
      setUploading(false)
    } catch {
      alert('Image upload failed.')
      setUploading(false)
    }
  }

  async function savePost() {
    if (!title.trim() || !finalSlug || !content.trim()) {
      alert('Title, slug, and content are required.')
      return
    }

    setSaving(true)

    const tagArray = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    const payload = {
      title,
      slug: finalSlug,
      excerpt,
      content,
      featured_image: finalFeaturedImage || null,
      featured_image_alt: featuredImageAlt,
      alt_text: featuredImageAlt,
      author,
      tags: tagArray,
      status,
      post_type: 'blog',
      is_featured: isFeatured,
      featured_badge: featuredBadge,
      read_time: finalReadTime,
      cta_text: ctaText.trim() || null,
      cta_link: ctaLink.trim() || null,
      published_at:
        status === 'published'
          ? initialPost?.published_at || new Date().toISOString()
          : initialPost?.published_at || null,

      seo_title: seoTitle || title,
      seo_description: seoDescription || excerpt.slice(0, 160),
      focus_keyword: focusKeyword,

      og_title: ogTitle || seoTitle || title,
      og_description: ogDescription || seoDescription || excerpt.slice(0, 200),
      og_image: ogImage.trim() || finalFeaturedImage || null,
      canonical_url: canonicalUrl.trim() || `${SITE_URL}/blog/${finalSlug}`,
      updated_at: new Date().toISOString(),
    }

    const result =
      mode === 'edit' && initialPost?.id
        ? await supabase.from('blog_posts').update(payload).eq('id', initialPost.id)
        : await supabase.from('blog_posts').insert(payload)

    setSaving(false)

    if (result.error) {
      alert(result.error.message)
      return
    }

    router.push('/admin/blog')
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Card title="Main Content">
            <Input label="Title" value={title} setValue={setTitle} />
            <Input label="Slug" value={finalSlug} setValue={setSlug} />
            <Textarea label="Excerpt" value={excerpt} setValue={setExcerpt} rows={4} />

            <div>
              <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
                Content Tools
              </span>

              <div className="mb-3 flex flex-wrap gap-2">
                <ToolButton onClick={() => insertSnippet('<h2>New section heading</h2>')}>H2</ToolButton>
                <ToolButton onClick={() => insertSnippet('<h3>Subheading</h3>')}>H3</ToolButton>
                <ToolButton onClick={() => insertSnippet('<p>Write your paragraph here.</p>')}>Paragraph</ToolButton>
                <ToolButton onClick={() => insertSnippet('<ul>\n  <li>First point</li>\n  <li>Second point</li>\n</ul>')}>List</ToolButton>
                <ToolButton onClick={() => insertSnippet('<blockquote>Important insight or quote here.</blockquote>')}>Quote</ToolButton>
                <ToolButton onClick={() => insertSnippet('<a href="https://hbeedigitals.com/contact" target="_blank" rel="noopener">Request a Growth Review</a>')}>Link</ToolButton>
              </div>

              <Textarea label="HTML Content" value={content} setValue={setContent} rows={24} mono />
            </div>
          </Card>

          <Card title="Image & Metadata">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
                Upload Featured Image
              </span>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadFeaturedImage(file)
                }}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-sm text-[var(--text-primary)]"
              />

              {uploading && (
                <p className="mt-2 text-sm font-bold text-[var(--accent)]">Uploading image...</p>
              )}
            </label>

            <Input label="Featured Image URL" value={featuredImage} setValue={setFeaturedImage} />
            <Input label="Featured Image Alt Text" value={featuredImageAlt} setValue={setFeaturedImageAlt} />
            <Input label="Author" value={author} setValue={setAuthor} />
            <Input label="Tags comma separated" value={tags} setValue={setTags} />
          </Card>

          <Card title="SEO & Social Sharing">
            <Input label="SEO Title" value={seoTitle} setValue={setSeoTitle} />
            <Textarea label="Meta Description" value={seoDescription} setValue={setSeoDescription} rows={3} />
            <Input label="Focus Keyword" value={focusKeyword} setValue={setFocusKeyword} />
            <Input label="OG Title" value={ogTitle} setValue={setOgTitle} />
            <Textarea label="OG Description" value={ogDescription} setValue={setOgDescription} rows={3} />
            <Input
              label="OG Image URL"
              value={ogImage}
              setValue={setOgImage}
              placeholder={finalFeaturedImage || 'Defaults to featured image'}
            />
            <Input
              label="Canonical URL"
              value={canonicalUrl}
              setValue={setCanonicalUrl}
              placeholder={`${SITE_URL}/blog/${finalSlug || 'your-slug'}`}
            />

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-4 text-sm text-[var(--text-muted)]">
              Leave OG Image and Canonical URL empty to auto-generate them from the
              featured image and slug:
              <br />
              <span className="break-all font-bold text-[var(--accent)]">
                {ogImage.trim() || finalFeaturedImage || 'Upload or paste featured image first'}
              </span>
            </div>
          </Card>

          <Card title="Article CTA">
            <p className="text-sm text-[var(--text-muted)]">
              Shown at the end of the article. Both fields must be filled to
              replace the default CTA, otherwise the generic growth-review CTA is
              used.
            </p>
            <Input
              label="CTA Text"
              value={ctaText}
              setValue={setCtaText}
              placeholder="e.g. Book a Shopify audit"
            />
            <Input
              label="CTA Link"
              value={ctaLink}
              setValue={setCtaLink}
              placeholder="/contact or https://..."
            />
          </Card>

          <button
            onClick={savePost}
            disabled={saving || uploading}
            className="rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-black text-[#07111F]"
          >
            {saving ? 'Saving...' : mode === 'edit' ? 'Update Blog Post' : 'Save Blog Post'}
          </button>
        </div>

        <div className="space-y-5 lg:sticky lg:top-6 lg:h-fit">
          <Card title="Publish Settings">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
                Status
              </span>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>

            <label className="flex items-center gap-3 text-sm font-bold text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              Featured article
            </label>

            <Input label="Featured Badge" value={featuredBadge} setValue={setFeaturedBadge} />

            <Input
              label="Read Time"
              value={readTimeInput}
              setValue={setReadTimeInput}
              placeholder={`Auto: ${readTime}`}
            />
            <p className="text-xs text-[var(--text-muted)]">
              Leave empty to use the auto-estimate ({readTime}).
            </p>
          </Card>

          <Card title="Preview">
            {finalFeaturedImage && (
              <img
                src={finalFeaturedImage}
                alt=""
                className="mb-4 aspect-[1200/630] w-full rounded-xl object-cover"
              />
            )}

            <h2 className="text-xl font-black text-[var(--text-primary)]">
              {title || 'Blog title preview'}
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {excerpt || 'Blog excerpt preview will appear here.'}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <h2 className="text-lg font-black text-[var(--text-primary)]">{title}</h2>
      {children}
    </div>
  )
}

function Input({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string
  value: string
  setValue: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">{label}</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
      />
    </label>
  )
}

function Textarea({
  label,
  value,
  setValue,
  rows,
  mono,
}: {
  label: string
  value: string
  setValue: (value: string) => void
  rows: number
  mono?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">{label}</span>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        className={`w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)] ${
          mono ? 'font-mono text-sm' : ''
        }`}
      />
    </label>
  )
}

function ToolButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-black text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      {children}
    </button>
  )
}