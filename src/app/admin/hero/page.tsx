'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAdminAuth } from '@/hooks/useAdminAuth'

interface HeroData {
  id: string
  title: string
  subtitle: string
  welcome_text: string
  feature_bullets: string
  primary_cta_text: string
  primary_cta_link: string
  secondary_cta_text: string
  secondary_cta_link: string
  background_image: string
  is_active: boolean
}

export default function HeroEditor() {
  const { user, loading: authLoading } = useAdminAuth()
  const [hero, setHero] = useState<HeroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authLoading && user) fetchHero()
  }, [authLoading, user])

  const fetchHero = async () => {
    try {
      const { data } = await supabase.from('hero_section').select('*').single()
      setHero(data || {
        id: '',
        title: 'We Build Exceptional Digital Experiences That Drive Growth',
        subtitle: 'Transform your business with cutting-edge technology and creative design.',
        welcome_text: 'Welcome to',
        feature_bullets: 'Web Development|UI/UX Design|Digital Marketing|Brand Strategy',
        primary_cta_text: 'Get Started',
        primary_cta_link: '/contact',
        secondary_cta_text: 'View Work',
        secondary_cta_link: '/portfolio',
        background_image: '',
        is_active: true
      })
    } catch (err) {
      console.error('Error fetching hero:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !hero) return
    if (!file.type.startsWith('image/')) { setMessage({ type: 'error', text: 'Please upload an image file' }); return }
    if (file.size > 5 * 1024 * 1024) { setMessage({ type: 'error', text: 'Image must be less than 5MB' }); return }
    setUploading(true)
    setMessage(null)
    try {
      const fileName = `hero-${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName)
      if (urlData?.publicUrl) {
        setHero({ ...hero, background_image: urlData.publicUrl })
        setMessage({ type: 'success', text: 'Image uploaded successfully!' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Upload failed: ' + err.message })
    } finally {
      setUploading(false)
    }
  }

  const applyRedesignedDefaults = () => {
    if (!hero) return
    setHero({
      ...hero,
      welcome_text: 'Digital Growth Studio',
      title: 'We build the digital systems that grow',
      feature_bullets: 'Ambitious Brands|E-commerce Teams|Growth Companies|Better Experiences',
      subtitle: 'Strategy, design and build for e-commerce and modern teams.',
    })
    setMessage({ type: 'success', text: 'Redesigned defaults filled in — press Save Changes to publish.' })
  }

  const handleSave = async () => {
    if (!hero) return
    setSaving(true)
    setMessage(null)
    try {
      const updateData: any = {
        title: hero.title,
        subtitle: hero.subtitle,
        welcome_text: hero.welcome_text,
        feature_bullets: hero.feature_bullets,
        primary_cta_text: hero.primary_cta_text,
        primary_cta_link: hero.primary_cta_link,
        secondary_cta_text: hero.secondary_cta_text,
        secondary_cta_link: hero.secondary_cta_link,
        background_image: hero.background_image,
        is_active: hero.is_active,
        updated_at: new Date().toISOString()
      }

      let error = null
      if (hero.id) {
        const result = await supabase.from('hero_section').update(updateData).eq('id', hero.id)
        error = result.error
      } else {
        const result = await supabase.from('hero_section').insert([{ ...updateData, created_at: new Date().toISOString() }])
        error = result.error
      }

      if (error) {
        setMessage({ type: 'error', text: 'Error: ' + error.message })
      } else {
        setMessage({ type: 'success', text: 'Hero section updated! Refresh homepage to see changes.' })
        fetchHero()
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="p-4" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Hero Section Editor</h1>
          <Link href="/admin/dashboard" className="text-white hover:opacity-80 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto p-6 max-w-4xl">
        {message && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            )}
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--primary-color)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Hero Section Content</h2>
          </div>

          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold">These fields control the redesigned homepage Hero.</p>
            <p className="mt-1">
              Leave a field <span className="font-medium">blank</span> to use its built-in default. The homepage headline reads as
              <span className="font-medium"> &ldquo;{`{Headline Prefix}`} {`{rotating phrase}`}&rdquo;</span>.
            </p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              <li><span className="font-medium">Eyebrow</span> default: &ldquo;Digital Growth Studio&rdquo;</li>
              <li><span className="font-medium">Headline Prefix</span> default: &ldquo;We build the digital systems that grow&rdquo;</li>
              <li><span className="font-medium">Rotating Phrases</span> default: &ldquo;Ambitious Brands | E-commerce Teams | Growth Companies | Better Experiences&rdquo;</li>
              <li><span className="font-medium">Subtitle</span> default: &ldquo;Strategy, design and build for e-commerce and modern teams.&rdquo;</li>
            </ul>
            <p className="mt-2">
              This row still holds pre-redesign copy (&ldquo;Engineering Growth For&rdquo;, &ldquo;Brand Identity|24/7 Support&rdquo;). The homepage
              ignores those specific legacy values and shows the redesigned defaults until you publish new content here.
            </p>
            <button
              type="button"
              onClick={applyRedesignedDefaults}
              className="mt-3 inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              Fill in redesigned defaults
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eyebrow <span className="text-gray-400 font-normal">(small label above the headline)</span></label>
              <input type="text" value={hero?.welcome_text || ''} onChange={(e) => setHero({ ...hero!, welcome_text: e.target.value })} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Digital Growth Studio" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Headline Prefix <span className="text-gray-400 font-normal">(fixed text shown before the rotating phrase)</span></label>
              <input type="text" value={hero?.title || ''} onChange={(e) => setHero({ ...hero!, title: e.target.value })} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="We build the digital systems that grow" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <textarea value={hero?.subtitle || ''} onChange={(e) => setHero({ ...hero!, subtitle: e.target.value })} rows={3} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Strategy, design and build for e-commerce and modern teams." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rotating Phrases <span className="text-gray-400 font-normal">(separate with | character)</span></label>
              <input type="text" value={hero?.feature_bullets || ''} onChange={(e) => setHero({ ...hero!, feature_bullets: e.target.value })} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Ambitious Brands|E-commerce Teams|Growth Companies|Better Experiences" />
              <p className="text-xs text-gray-500 mt-1">Each phrase rotates one at a time after the headline prefix. Keep them short (1–3 words). Leave blank for the defaults.</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Hero Image</label>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                {uploading ? 'Uploading...' : 'Upload Image'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-500 mb-1">Or paste image URL:</label>
                <input type="text" value={hero?.background_image || ''} onChange={(e) => setHero({ ...hero!, background_image: e.target.value })} className="w-full p-3 border rounded-lg text-sm" placeholder="https://example.com/hero-bg.jpg" />
              </div>
              {hero?.background_image && (
                <div className="mt-3 relative rounded-lg overflow-hidden h-40 bg-gray-100 border"><img src={hero.background_image} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} /></div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>Call-to-Action Buttons</label>
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Primary Button Text</label><input type="text" value={hero?.primary_cta_text || ''} onChange={(e) => setHero({ ...hero!, primary_cta_text: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Primary Button Link</label><input type="text" value={hero?.primary_cta_link || ''} onChange={(e) => setHero({ ...hero!, primary_cta_link: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Secondary Button Text</label><input type="text" value={hero?.secondary_cta_text || ''} onChange={(e) => setHero({ ...hero!, secondary_cta_text: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Secondary Button Link</label><input type="text" value={hero?.secondary_cta_link || ''} onChange={(e) => setHero({ ...hero!, secondary_cta_link: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm" /></div>
              </div>
            </div>

            <div className="flex items-center gap-3 py-2">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={hero?.is_active || false} onChange={(e) => setHero({ ...hero!, is_active: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm font-medium text-gray-700">Active (visible on website)</span></label>
            </div>

            <div className="border-t pt-6 flex gap-3">
              <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 font-medium" style={{ backgroundColor: 'var(--primary-color)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link href="/admin/dashboard" className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}