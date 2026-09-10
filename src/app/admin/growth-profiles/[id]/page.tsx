// src/app/admin/growth-profiles/[id]/page.tsx

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

export default function AdminGrowthProfileDetailPage({ params }: PageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [merchant, setMerchant] = useState<any>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [params.id])

  async function fetchProfile() {
    setLoading(true)
    try {
      // One call: /api/admin/growth-profiles/[id] returns the profile with its
      // merchant, assessment and latest PDF, after verifying session, user-bound
      // admin 2FA and active admin membership.
      const response = await fetch(`/api/admin/growth-profiles/${params.id}`, {
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.profile) {
        setLoadError(payload?.error || 'Could not load this profile. Please refresh and try again.')
        return
      }

      setLoadError(null)
      setProfile(payload.profile)
      setMerchant(payload.profile.merchant)
      setPdfUrl(payload.pdf_url || null)
    } catch (error) {
      console.error('Error:', error)
      setLoadError('Could not load this profile. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }

  const getClassificationColor = (classification: string) => {
    const colors: Record<string, string> = {
      'Foundation': 'border-blue-500/30 bg-blue-500/10 text-blue-500',
      'Foundation Stage': 'border-blue-500/30 bg-blue-500/10 text-blue-500',
      'Growth Potential': 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500',
      'Growth Ready': 'border-green-500/30 bg-green-500/10 text-green-500',
      'Scale Ready': 'border-purple-500/30 bg-purple-500/10 text-purple-500'
    }
    return colors[classification] || 'border-gray-500/30 bg-gray-500/10 text-gray-500'
  }

  const classificationEmojis: Record<string, string> = {
    'Foundation': '🏗️',
    'Foundation Stage': '🏗️',
    'Growth Potential': '🌱',
    'Growth Ready': '🚀',
    'Scale Ready': '🌍'
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  // An authorization or database failure is shown as a real error. It must
  // never render as an empty list, which would read as "no records".
  if (loadError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <SvgIcon name="warning" size={48} color="var(--error)" />
        <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
          Could not load this profile
        </h2>
        <p className="mt-2 max-w-md text-[var(--text-secondary)]">{loadError}</p>
        <button
          type="button"
          onClick={fetchProfile}
          className="mt-6 rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <SvgIcon name="warning" size={48} color="var(--text-muted)" />
        <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">Profile Not Found</h2>
        <p className="mt-2 text-[var(--text-secondary)]">The growth profile you're looking for doesn't exist.</p>
        <Link href="/admin/growth-profiles">
          <Button className="mt-6">Back to Profiles</Button>
        </Link>
      </div>
    )
  }

  const classificationColor = getClassificationColor(profile.growth_classification)
  const emoji = classificationEmojis[profile.growth_classification] || '📈'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/growth-profiles" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <SvgIcon name="chevron-left" size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {profile.title || `${merchant?.business_name || 'Business'} - Growth Profile`}
            </h1>
          </div>
          <p className="text-[var(--text-secondary)]">
            {merchant?.business_name} • Generated {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary">
                <SvgIcon name="download" size={16} />
                Download PDF
              </Button>
            </a>
          )}
          <Link href={`/admin/merchants/${profile.merchant_id}`}>
            <Button>
              <SvgIcon name="user" size={16} color="white" />
              View Merchant
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex flex-shrink-0 flex-col items-center">
                <div className="text-5xl font-bold text-[var(--text-primary)]">
                  {profile.hgri_score || 0}
                </div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">HGRI™ Score</div>
              </div>
              <div className="hidden h-16 w-px bg-[var(--border)] md:block" />
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{emoji}</span>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${classificationColor}`}>
                    {profile.growth_classification}
                  </span>
                </div>
                <p className="mt-2 text-[var(--text-secondary)]">{profile.summary}</p>
              </div>
            </div>
          </div>

          {/* Pillar Scores */}
          {profile.profile_data?.scores?.pillars && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Growth Pillars</h3>
              <div className="space-y-4">
                {Object.entries(profile.profile_data.scores.pillars).map(([pillar, score]: [string, any]) => {
                  const pillarLabels: Record<string, string> = {
                    visibility: 'Visibility',
                    conversion: 'Conversion',
                    retention: 'Retention',
                    authority: 'Authority',
                    scalability: 'Scalability'
                  }
                  const label = pillarLabels[pillar] || pillar.charAt(0).toUpperCase() + pillar.slice(1)
                  const scoreValue = typeof score === 'number' ? score : score?.score || 0

                  return (
                    <div key={pillar}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{scoreValue}/100</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-section)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                          style={{ width: `${Math.min(scoreValue, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Strengths & Opportunities */}
          <div className="grid gap-6 md:grid-cols-2">
            {profile.strengths && profile.strengths.length > 0 && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <div className="flex items-center gap-2">
                  <SvgIcon name="check" size={20} color="#22C55E" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Strengths</h3>
                </div>
                <ul className="mt-3 space-y-2">
                  {profile.strengths.map((strength: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="mt-1 text-green-500">•</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {profile.opportunities && profile.opportunities.length > 0 && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <div className="flex items-center gap-2">
                  <SvgIcon name="growth" size={20} color="#F97316" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Opportunities</h3>
                </div>
                <ul className="mt-3 space-y-2">
                  {profile.opportunities.map((opportunity: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="mt-1 text-[var(--accent)]">•</span>
                      {opportunity}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {profile.profile_data?.recommendations && profile.profile_data.recommendations.length > 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <div className="flex items-center gap-2">
                <SvgIcon name="strategy" size={20} color="#3B82F6" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Growth Recommendations</h3>
              </div>
              <ul className="mt-3 space-y-3">
                {profile.profile_data.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                    <span className="mt-1 flex-shrink-0 text-[var(--accent)]">{index + 1}.</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Profile Data (JSON) */}
          {profile.profile_data && (
            <details className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text-primary)]">
                Raw Profile Data
              </summary>
              <pre className="mt-4 overflow-x-auto rounded-lg bg-[var(--bg-section)] p-4 text-xs text-[var(--text-secondary)]">
                {JSON.stringify(profile.profile_data, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Merchant Info */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Merchant Information</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-[var(--text-muted)]">Business</dt>
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

          {/* Profile Details */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Profile Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-[var(--text-muted)]">Status</dt>
                <dd><StatusBadge status={profile.is_active ? 'active' : 'archived'} /></dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[var(--text-muted)]">Created</dt>
                <dd className="text-[var(--text-secondary)]">{new Date(profile.created_at).toLocaleDateString()}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[var(--text-muted)]">Updated</dt>
                <dd className="text-[var(--text-secondary)]">{new Date(profile.updated_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>

          {/* Actions */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Actions</h3>
            <div className="space-y-2">
              <Link href={`/admin/proposals/new?merchant=${profile.merchant_id}`}>
                <Button className="w-full">
                  <SvgIcon name="pricing" size={16} color="white" />
                  Create Proposal
                </Button>
              </Link>
              <Link href={`/admin/growth-reviews?merchant=${profile.merchant_id}`}>
                <Button variant="secondary" className="w-full">
                  <SvgIcon name="eye" size={16} />
                  View Reviews
                </Button>
              </Link>
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="secondary" className="w-full">
                    <SvgIcon name="download" size={16} />
                    Download PDF
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}