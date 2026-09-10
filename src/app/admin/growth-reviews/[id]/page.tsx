'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
        // Surfaced explicitly — an authorization or database failure must not
        // render as an empty review form.
        setLoadError(payload?.error || 'Could not load this review. Please refresh and try again.')
        return
      }

      const data = payload.review
      setLoadError(null)
      setReview(data)
      setMerchant(data.merchant)
      setAssessment(data.assessment)

      if (data) {
        setFormData({
          review_notes: data.review_notes || '',
          hgri_score: data.hgri_score || data.assessment?.hgri_score || 0,
          growth_classification: data.growth_classification || data.assessment?.growth_classification || 'Growth Potential',
          strengths: data.strengths || [''],
          opportunities: data.opportunities || [''],
          visibility_score: data.visibility_score || data.assessment?.visibility_score || 0,
          conversion_score: data.conversion_score || data.assessment?.conversion_score || 0,
          retention_score: data.retention_score || data.assessment?.retention_score || 0,
          authority_score: data.authority_score || data.assessment?.authority_score || 0,
          scalability_score: data.scalability_score || data.assessment?.scalability_score || 0,
          status: data.status || 'pending'
        })
      }
    } catch (error) {
      console.error('Error:', error)
      setLoadError('Could not load this review. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      // PATCH cannot set status or completed_at — completing a review still
      // goes through /api/growth-reviews/[id]/complete, which generates the
      // Growth Profile.
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

      alert('✅ Review saved successfully!')
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
    setGenerating(true)
    try {
      const response = await fetch(`/api/growth-reviews/${params.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
          merchant_id: merchant?.id,
          assessment_id: assessment?.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete review')
      }

      alert('🎉 Review completed! Growth profile has been generated.')
      router.push(`/admin/growth-profiles/${result.profile_id}`)
    } catch (error: any) {
      console.error('Error:', error)
      alert(error.message || 'An error occurred while completing the review.')
    } finally {
      setSaving(false)
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  // A failed or denied load is distinct from "this review does not exist".
  if (loadError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <SvgIcon name="warning" size={48} color="var(--error)" />
        <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
          Could not load this review
        </h2>
        <p className="mt-2 max-w-md text-[var(--text-secondary)]">{loadError}</p>
        <div className="mt-6 flex gap-3">
          <Button onClick={fetchReview}>Try Again</Button>
          <Link href="/admin/growth-reviews">
            <Button variant="secondary">Back to Reviews</Button>
          </Link>
        </div>
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
  const isCompleted = formData.status === 'completed'

  return (
    <div className="space-y-6">
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
          <p className="text-[var(--text-secondary)]">
            {merchant?.email} • Submitted {new Date(review.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleSave} disabled={saving || isCompleted}>
            {saving ? 'Saving...' : 'Save Notes'}
          </Button>
          {!isCompleted && (
            <Button onClick={handleCompleteReview} disabled={saving || generating}>
              {generating ? 'Generating Profile...' : 'Complete Review'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
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
                  disabled={isCompleted}
                  className="w-full accent-[var(--accent)] disabled:opacity-50"
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
                disabled={isCompleted}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
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
                { key: 'visibility_score', label: 'Visibility', color: 'bg-blue-500' },
                { key: 'conversion_score', label: 'Conversion', color: 'bg-green-500' },
                { key: 'retention_score', label: 'Retention', color: 'bg-purple-500' },
                { key: 'authority_score', label: 'Authority', color: 'bg-yellow-500' },
                { key: 'scalability_score', label: 'Scalability', color: 'bg-orange-500' }
              ].map(({ key, label, color }) => (
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
                      disabled={isCompleted}
                      className="w-16 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1 text-sm text-[var(--text-primary)] text-center focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
                    />
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-section)]">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-300`}
                      style={{ width: `${Math.min(formData[key as keyof typeof formData] as number || 0, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Opportunities */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Strengths</h3>
                {!isCompleted && (
                  <button
                    onClick={() => {
                      setFormData({ ...formData, strengths: [...formData.strengths, ''] })
                    }}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    + Add
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {formData.strengths.map((strength, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={strength}
                      onChange={(e) => {
                        const newStrengths = [...formData.strengths]
                        newStrengths[index] = e.target.value
                        setFormData({ ...formData, strengths: newStrengths })
                      }}
                      placeholder="Enter a strength..."
                      disabled={isCompleted}
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
                    />
                    {!isCompleted && formData.strengths.length > 1 && (
                      <button
                        onClick={() => {
                          const newStrengths = formData.strengths.filter((_, i) => i !== index)
                          setFormData({ ...formData, strengths: newStrengths })
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <SvgIcon name="x-close" size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Opportunities</h3>
                {!isCompleted && (
                  <button
                    onClick={() => {
                      setFormData({ ...formData, opportunities: [...formData.opportunities, ''] })
                    }}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    + Add
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {formData.opportunities.map((opportunity, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={opportunity}
                      onChange={(e) => {
                        const newOpportunities = [...formData.opportunities]
                        newOpportunities[index] = e.target.value
                        setFormData({ ...formData, opportunities: newOpportunities })
                      }}
                      placeholder="Enter an opportunity..."
                      disabled={isCompleted}
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
                    />
                    {!isCompleted && formData.opportunities.length > 1 && (
                      <button
                        onClick={() => {
                          const newOpportunities = formData.opportunities.filter((_, i) => i !== index)
                          setFormData({ ...formData, opportunities: newOpportunities })
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <SvgIcon name="x-close" size={16} />
                      </button>
                    )}
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
              disabled={isCompleted}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
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

          {!isCompleted && (
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="flex items-start gap-3">
                <SvgIcon name="info" size={20} color="#3B82F6" className="mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-600">Ready to Complete?</h4>
                  <p className="text-xs text-blue-600/80 mt-1">
                    Review the scores, add strengths and opportunities, then click "Complete Review" to generate the growth profile.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
              <div className="flex items-start gap-3">
                <SvgIcon name="check" size={20} color="#22C55E" className="mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-green-600">Review Completed</h4>
                  <p className="text-xs text-green-600/80 mt-1">
                    This review has been completed. The growth profile has been generated and is available for the merchant.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}