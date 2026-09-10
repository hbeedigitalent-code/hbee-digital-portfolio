// src/app/admin/growth-reviews/[id]/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MerchantLifecycleService } from '@/lib/services/merchant-lifecycle'
import StatusBadge from '@/components/ui/StatusBadge'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

interface PageProps {
  params: {
    id: string
  }
}

export default function AdminGrowthReviewDetailPage({ params }: PageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [review, setReview] = useState<any>(null)
  const [assessment, setAssessment] = useState<any>(null)
  const [merchant, setMerchant] = useState<any>(null)
  const [formData, setFormData] = useState({
    review_notes: '',
    hgri_score: 0,
    growth_classification: 'Growth Potential',
    strengths: [''],
    opportunities: [''],
    visibility_score: 0,
    conversion_score: 0,
    retention_score: 0,
    authority_score: 0,
    scalability_score: 0,
    status: 'pending'
  })
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchReview()
  }, [params.id])

  async function fetchReview() {
    setLoading(true)
    try {
      // /api/admin/growth-reviews/[id] verifies session, user-bound admin 2FA
      // and active admin membership before reading growth_reviews.
      const response = await fetch(`/api/admin/growth-reviews/${params.id}`, {
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.review) {
        setLoadError(payload?.error || 'Could not load this review. Please refresh and try again.')
        return
      }

      const data = payload.review
      setLoadError(null)
      setReview(data)
      setMerchant(data.merchant)
      setAssessment(data.assessment)

      // Populate form data
      if (data) {
        setFormData({
          review_notes: data.review_notes || '',
          hgri_score: data.hgri_score || data.assessment?.hgri_score || 0,
          growth_classification: data.growth_classification || data.assessment?.growth_classification || 'Growth Potential',
          strengths: data.strengths || [''],
          opportunities: data.opportunities || [''],
          visibility_score: data.visibility_score || 0,
          conversion_score: data.conversion_score || 0,
          retention_score: data.retention_score || 0,
          authority_score: data.authority_score || 0,
          scalability_score: data.scalability_score || 0,
          status: data.status || 'pending'
        })
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/growth-reviews/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          review_notes: formData.review_notes,
          hgri_score: formData.hgri_score,
          growth_classification: formData.growth_classification,
          strengths: formData.strengths.filter(s => s.trim()),
          opportunities: formData.opportunities.filter(s => s.trim()),
          visibility_score: formData.visibility_score,
          conversion_score: formData.conversion_score,
          retention_score: formData.retention_score,
          authority_score: formData.authority_score,
          scalability_score: formData.scalability_score,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        alert(payload?.error || 'Failed to save review. Please try again.')
        return
      }

      alert('Review saved successfully!')
      await fetchReview()
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCompleteReview() {
    if (!confirm('Complete this review? This will generate the growth profile for the merchant.')) return

    setSaving(true)
    try {
      // SINGLE COMPLETION PATH. This page previously completed a review
      // entirely from the browser: it set growth_reviews.status to
      // 'completed', wrote growth_assessments.review_status = 'approved'
      // unconditionally, then generated the profile client-side. That was a
      // second, ungated route to the same operation, and it is why stored
      // approval values cannot by themselves evidence a deliberate decision.
      // It now calls the one server route that owns completion, which
      // verifies session, admin 2FA and active membership, and derives the
      // merchant and assessment from the stored review row.
      setGenerating(true)
      const response = await fetch(`/api/growth-reviews/${params.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          review_notes: formData.review_notes,
          hgri_score: formData.hgri_score,
          growth_classification: formData.growth_classification,
          strengths: formData.strengths.filter(s => s.trim()),
          opportunities: formData.opportunities.filter(s => s.trim()),
          visibility_score: formData.visibility_score,
          conversion_score: formData.conversion_score,
          retention_score: formData.retention_score,
          authority_score: formData.authority_score,
          scalability_score: formData.scalability_score,
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        alert(result?.error || 'Failed to complete review. Please try again.')
        return
      }

      alert('🎉 Review completed! Growth profile has been generated.')
      router.push(`/admin/growth-profiles/${result.profile_id}`)
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while completing the review.')
    } finally {
      setSaving(false)
      setGenerating(false)
    }
  }

  function generateRecommendations(data: any): string[] {
    const recommendations = []
    
    if (data.visibility_score < 50) {
      recommendations.push('Improve SEO and content strategy to increase visibility')
    }
    if (data.conversion_score < 50) {
      recommendations.push('Optimize conversion funnel and user experience')
    }
    if (data.retention_score < 50) {
      recommendations.push('Implement email marketing and customer retention strategies')
    }
    if (data.authority_score < 50) {
      recommendations.push('Build brand authority through content and social proof')
    }
    if (data.scalability_score < 50) {
      recommendations.push('Develop scalable systems and processes')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Continue optimizing your current growth strategies')
      recommendations.push('Explore new channels for customer acquisition')
    }
    
    return recommendations
  }

  function handleArrayField(
    field: 'strengths' | 'opportunities',
    index: number,
    value: string
  ) {
    const newArray = [...formData[field]]
    newArray[index] = value
    setFormData({ ...formData, [field]: newArray })
  }

  function addArrayField(field: 'strengths' | 'opportunities') {
    setFormData({
      ...formData,
      [field]: [...formData[field], '']
    })
  }

  function removeArrayField(field: 'strengths' | 'opportunities', index: number) {
    const newArray = formData[field].filter((_, i) => i !== index)
    if (newArray.length === 0) newArray.push('')
    setFormData({ ...formData, [field]: newArray })
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (!review) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <SvgIcon name="warning" size={48} color="var(--text-muted)" />
        <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">Review Not Found</h2>
        <p className="mt-2 text-[var(--text-secondary)]">The growth review you're looking for doesn't exist.</p>
        <Link href="/admin/growth-reviews">
          <Button className="mt-6">Back to Reviews</Button>
        </Link>
      </div>
    )
  }

  const classifications = ['Foundation', 'Growth Potential', 'Growth Ready', 'Scale Ready']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/growth-reviews" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <SvgIcon name="chevron-left" size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {merchant?.business_name || 'Review'} - Growth Review
            </h1>
            <StatusBadge status={formData.status} />
          </div>
          <p className="mt-1 text-[var(--text-secondary)]">
            {merchant?.email} • Submitted {new Date(review.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Notes'}
          </Button>
          {formData.status !== 'completed' && (
            <Button onClick={handleCompleteReview} disabled={saving || generating}>
              {generating ? 'Generating Profile...' : 'Complete Review'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Scores & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">HGRI™ Score</h3>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.hgri_score}
                  onChange={(e) => setFormData({ ...formData, hgri_score: parseInt(e.target.value) })}
                  className="w-full accent-[var(--accent)]"
                />
              </div>
              <div className="text-3xl font-bold text-[var(--text-primary)] min-w-[60px] text-center">
                {formData.hgri_score}
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Classification</label>
              <select
                value={formData.growth_classification}
                onChange={(e) => setFormData({ ...formData, growth_classification: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                {classifications.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pillar Scores */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Pillar Scores</h3>
            <div className="space-y-4">
              {[
                { key: 'visibility_score', label: 'Visibility' },
                { key: 'conversion_score', label: 'Conversion' },
                { key: 'retention_score', label: 'Retention' },
                { key: 'authority_score', label: 'Authority' },
                { key: 'scalability_score', label: 'Scalability' }
              ].map(({ key, label }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData[key as keyof typeof formData] as number}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        [key]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                      })}
                      className="w-16 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1 text-sm text-[var(--text-primary)] text-center focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-section)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                      style={{ width: `${Math.min(formData[key as keyof typeof formData] as number || 0, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Opportunities */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Strengths */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Strengths</h3>
                <button
                  onClick={() => addArrayField('strengths')}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {formData.strengths.map((strength, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={strength}
                      onChange={(e) => handleArrayField('strengths', index, e.target.value)}
                      placeholder="Enter a strength..."
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                    />
                    <button
                      onClick={() => removeArrayField('strengths', index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <SvgIcon name="x-close" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Opportunities */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Opportunities</h3>
                <button
                  onClick={() => addArrayField('opportunities')}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {formData.opportunities.map((opportunity, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={opportunity}
                      onChange={(e) => handleArrayField('opportunities', index, e.target.value)}
                      placeholder="Enter an opportunity..."
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                    />
                    <button
                      onClick={() => removeArrayField('opportunities', index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <SvgIcon name="x-close" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Review Notes */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Review Notes</h3>
            <textarea
              value={formData.review_notes}
              onChange={(e) => setFormData({ ...formData, review_notes: e.target.value })}
              rows={4}
              placeholder="Add your review notes here..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>

        {/* Right Column - Business Info & Activity */}
        <div className="space-y-6">
          {/* Business Info */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Business Information</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-[var(--text-muted)]">Business Name</dt>
                <dd className="font-medium text-[var(--text-primary)]">{merchant?.business_name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Email</dt>
                <dd className="font-medium text-[var(--text-primary)]">{merchant?.email || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Website</dt>
                <dd className="font-medium text-[var(--text-primary)]">
                  {merchant?.website ? (
                    <a href={merchant.website} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                      {merchant.website}
                    </a>
                  ) : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Industry</dt>
                <dd className="font-medium text-[var(--text-primary)]">{merchant?.industry || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Country</dt>
                <dd className="font-medium text-[var(--text-primary)]">{merchant?.country || 'N/A'}</dd>
              </div>
            </dl>
          </div>

          {/* Activity */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Activity</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[var(--text-muted)]">Created</span>
                <span className="text-[var(--text-secondary)]">{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
              {review.updated_at && (
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="text-[var(--text-muted)]">Last Updated</span>
                  <span className="text-[var(--text-secondary)]">{new Date(review.updated_at).toLocaleDateString()}</span>
                </div>
              )}
              {review.completed_at && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Completed</span>
                  <span className="text-[var(--text-secondary)]">{new Date(review.completed_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}