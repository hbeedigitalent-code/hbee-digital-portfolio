'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface LogoRow {
  name: string
  logo: string
  active: boolean
}

const LOGO_BUCKET = 'project-images'
const ALLOWED_LOGO_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]

function parseLogos(raw: unknown): LogoRow[] {
  let arr: unknown = raw
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw)
    } catch {
      arr = []
    }
  }
  if (!Array.isArray(arr)) return []
  return arr.map((x) => {
    const item = (x || {}) as Record<string, unknown>
    return {
      name: typeof item.name === 'string' ? item.name : '',
      logo: typeof item.logo === 'string' ? item.logo : '',
      active: item.active !== false,
    }
  })
}

export default function AdminTrustPage() {
  const [form, setForm] = useState({
    badge: 'Trusted by merchants worldwide', headline: 'Built on trust. Delivering results.',
    highlighted_word: 'trust', description: '', stats: '[]', partner_logos: '[]',
    testimonials: '[]', trust_badges: '[]', cta_text: 'Start Your Growth Review',
    cta_link: '/contact', is_active: true
  })
  const [logos, setLogos] = useState<LogoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({})

  useEffect(() => { fetchTrustSection() }, [])

  async function fetchTrustSection() {
    const { data } = await supabase.from('trust_section').select('*').single()
    if (data) {
      setForm(data)
      setLogos(parseLogos(data.partner_logos))
    }
    setLoading(false)
  }

  function flash(msg: string) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  function updateLogo(index: number, patch: Partial<LogoRow>) {
    setLogos((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function moveLogo(index: number, dir: -1 | 1) {
    setLogos((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function removeLogo(index: number) {
    setLogos((prev) => prev.filter((_, i) => i !== index))
  }

  function addLogo() {
    setLogos((prev) => [...prev, { name: '', logo: '', active: true }])
  }

  async function handleLogoUpload(index: number, file: File) {
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      flash('Error: use PNG, JPG, WebP, or SVG.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      flash('Error: logo must be under 5MB.')
      return
    }
    setUploadingIndex(index)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `trust-logos/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(fileName, file, { cacheControl: '3600', upsert: false })
      if (uploadError) {
        flash(`Error: ${uploadError.message}`)
        return
      }
      const { data: urlData } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(fileName)
      updateLogo(index, { logo: urlData.publicUrl })
    } finally {
      setUploadingIndex(null)
      const input = fileInputs.current[index]
      if (input) input.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      partner_logos: logos.map((row) => ({
        name: row.name.trim(),
        logo: row.logo.trim(),
        active: row.active,
      })),
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('trust_section').upsert(payload)
    setMessage(error ? `Error: ${error.message}` : 'Trust section saved!')
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-black text-[var(--text-primary)]">Trust Section</h2><p className="text-sm text-[var(--text-secondary)]">Manage homepage trust signals.</p></div>
      {message && <div className={`rounded-xl border p-3 text-sm ${message.includes('Error') ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]'}`}>{message}</div>}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="grid gap-4 md:grid-cols-2"><input placeholder="Badge" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /><input placeholder="Highlighted Word" value={form.highlighted_word} onChange={(e) => setForm({ ...form, highlighted_word: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
        <input placeholder="Headline" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
        <textarea placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
        <textarea placeholder="Stats JSON" rows={4} value={form.stats} onChange={(e) => setForm({ ...form, stats: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 font-mono text-xs" />

        {/* Trusted brand logos */}
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-section)]/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">Trusted Brand Logos</p>
              <p className="text-xs text-[var(--text-secondary)]">Shown in the &ldquo;We are trusted by&rdquo; section. PNG, JPG, WebP, or SVG.</p>
            </div>
            <button type="button" onClick={addLogo} className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-1.5 text-xs font-bold text-[var(--accent)]">+ Add logo</button>
          </div>

          {logos.length === 0 && <p className="text-xs text-[var(--text-muted)]">No logos yet. Click &ldquo;Add logo&rdquo; to create one.</p>}

          <div className="space-y-3">
            {logos.map((row, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 sm:grid-cols-[auto_1fr_auto]">
                <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-section)]">
                  {row.logo
                    ? <img src={row.logo} alt={row.name || 'logo preview'} className="max-h-12 max-w-[84px] object-contain" />
                    : <span className="text-[10px] text-[var(--text-muted)]">No image</span>}
                </div>

                <div className="space-y-2">
                  <input
                    placeholder="Brand name"
                    value={row.name}
                    onChange={(e) => updateLogo(index, { name: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2 text-sm"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={(el) => { fileInputs.current[index] = el }}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(index, f) }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputs.current[index]?.click()}
                      disabled={uploadingIndex === index}
                      className="rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-50"
                    >
                      {uploadingIndex === index ? 'Uploading…' : row.logo ? 'Replace image' : 'Upload image'}
                    </button>
                    <input
                      placeholder="or paste logo URL"
                      value={row.logo}
                      onChange={(e) => updateLogo(index, { logo: e.target.value })}
                      className="min-w-[160px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2 text-xs"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <input type="checkbox" checked={row.active} onChange={(e) => updateLogo(index, { active: e.target.checked })} />
                    Visible on website
                  </label>
                </div>

                <div className="flex flex-row gap-1 sm:flex-col">
                  <button type="button" onClick={() => moveLogo(index, -1)} disabled={index === 0} className="rounded-md border border-[var(--border)] px-2 py-1 text-xs disabled:opacity-30" aria-label="Move up">↑</button>
                  <button type="button" onClick={() => moveLogo(index, 1)} disabled={index === logos.length - 1} className="rounded-md border border-[var(--border)] px-2 py-1 text-xs disabled:opacity-30" aria-label="Move down">↓</button>
                  <button type="button" onClick={() => removeLogo(index)} className="rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-400" aria-label="Remove">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <textarea placeholder="Testimonials JSON" rows={4} value={form.testimonials} onChange={(e) => setForm({ ...form, testimonials: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 font-mono text-xs" />
        <textarea placeholder="Trust Badges JSON" rows={4} value={form.trust_badges} onChange={(e) => setForm({ ...form, trust_badges: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 font-mono text-xs" />
        <div className="grid gap-4 md:grid-cols-2"><input placeholder="CTA Text" value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /><input placeholder="CTA Link" value={form.cta_link} onChange={(e) => setForm({ ...form, cta_link: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active on website</label>
        <button type="submit" disabled={saving} className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-black text-[var(--btn-primary-text)]">{saving ? 'Saving...' : 'Save Trust Section'}</button>
      </form>
    </div>
  )
}
