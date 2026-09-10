// src/app/client-portal/growth-profile/page.tsx
//
// The client's Growth Profile.
//
// This page no longer touches Supabase. It previously resolved the merchant in
// the browser by trying, in order: merchants.email = user.email,
// merchant_accounts.email = user.email, clients.merchant_id, and finally
// `user.user_metadata.merchant_id` — a field the user can write themselves.
// All four are gone. The page now reads only
// /api/client-portal/growth-profile, which derives clients.id from the verified
// session, follows the stored merchant link, and returns an allow-listed,
// merchant-safe payload.
//
// The route decides visibility; this page only renders the state it is given,
// so no access rule lives in the browser.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

type ProfileState =
  | 'loading'
  | 'ready'
  | 'not_connected'
  | 'no_assessment'
  | 'under_review'
  | 'not_available'
  | 'ambiguous'
  | 'inconsistent'
  | 'error'

interface ClientGrowthProfile {
  id: string
  title: string | null
  summary: string | null
  hgri_score: number | null
  growth_classification: string | null
  pillars: Record<string, number> | null
  recommendations: string[]
  strengths: string[]
  opportunities: string[]
  created_at: string
  pdf_url: string | null
}

const CLASSIFICATION_EMOJIS: Record<string, string> = {
  'Foundation': '🏗️',
  'Foundation Stage': '🏗️',
  'Growth Potential': '🌱',
  'Growth Ready': '🚀',
  'Scale Ready': '🌍',
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  'Foundation': 'border-blue-500/30 bg-blue-500/10',
  'Foundation Stage': 'border-blue-500/30 bg-blue-500/10',
  'Growth Potential': 'border-yellow-500/30 bg-yellow-500/10',
  'Growth Ready': 'border-green-500/30 bg-green-500/10',
  'Scale Ready': 'border-purple-500/30 bg-purple-500/10',
}

const CLASSIFICATION_TEXT_COLORS: Record<string, string> = {
  'Foundation': 'text-blue-500',
  'Foundation Stage': 'text-blue-500',
  'Growth Potential': 'text-yellow-500',
  'Growth Ready': 'text-green-500',
  'Scale Ready': 'text-purple-500',
}

const PILLAR_LABELS: Record<string, string> = {
  visibility: 'Visibility',
  conversion: 'Conversion',
  retention: 'Retention',
  authority: 'Authority',
  scalability: 'Scalability',
}

/** Shared shell for every non-ready state. */
function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: string
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4 text-center">
      <SvgIcon name={icon} size={56} color="var(--text-muted)" />
      <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)] md:text-2xl">{title}</h2>
      <div className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">{children}</div>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}

export default function GrowthProfilePage() {
  const [state, setState] = useState<ProfileState>('loading')
  const [profile, setProfile] = useState<ClientGrowthProfile | null>(null)

  const fetchProfile = useCallback(async () => {
    setState('loading')
    try {
      const response = await fetch('/api/client-portal/growth-profile', {
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => null)

      if (response.status === 409) {
        // Ambiguous ownership or inconsistent records. Both withhold content.
        setState(payload?.state === 'inconsistent' ? 'inconsistent' : 'ambiguous')
        return
      }

      if (!response.ok) {
        setState('error')
        return
      }

      if (payload?.state === 'ready' && payload?.profile) {
        setProfile(payload.profile as ClientGrowthProfile)
        setState('ready')
        return
      }

      const known: ProfileState[] = [
        'not_connected',
        'no_assessment',
        'under_review',
        'not_available',
      ]
      setState(known.includes(payload?.state) ? payload.state : 'error')
    } catch (err) {
      console.error('Error:', err)
      setState('error')
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  if (state === 'loading') {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  // The account exists but carries no merchant link. Deliberately offers a
  // contact route and nothing else: no candidate merchants are shown, and there
  // is no self-service "link me by email" action.
  if (state === 'not_connected') {
    return (
      <EmptyState
        icon="growth-profile"
        title="Your Growth Profile is not connected yet"
        action={
          <>
            <Link href="/contact">
              <Button>
                <SvgIcon name="email" size={16} color="white" />
                Contact Hbee Digitals
              </Button>
            </Link>
            <Link href="/client-portal">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
          </>
        }
      >
        <p>
          This portal account is not yet connected to your business record, so we
          cannot show a Growth Profile here.
        </p>
        <p className="mt-2">
          Get in touch and we will connect it for you. If you have completed the
          Growth Readiness Assessment, mention the email address you used.
        </p>
      </EmptyState>
    )
  }

  if (state === 'ambiguous') {
    return (
      <EmptyState
        icon="warning"
        title="We need to check your account"
        action={
          <Link href="/contact">
            <Button>
              <SvgIcon name="email" size={16} color="white" />
              Contact Hbee Digitals
            </Button>
          </Link>
        }
      >
        <p>
          Your sign-in is linked to more than one business record, so we have not
          shown a profile rather than risk showing the wrong one. Please contact us
          and we will sort it out.
        </p>
      </EmptyState>
    )
  }

  // Records disagree with each other (profile not bound to the approving
  // assessment, wrong merchant, or more than one active profile). A genuine
  // error state, deliberately not an empty "nothing here" page.
  if (state === 'inconsistent') {
    return (
      <EmptyState
        icon="warning"
        title="We need to check your Growth Profile"
        action={
          <Link href="/contact">
            <Button>
              <SvgIcon name="email" size={16} color="white" />
              Contact Hbee Digitals
            </Button>
          </Link>
        }
      >
        <p>
          Your records need a quick check before we can show your profile, so we
          have not displayed anything rather than risk showing the wrong
          information. Please contact us and we will resolve it.
        </p>
      </EmptyState>
    )
  }

  if (state === 'no_assessment') {
    return (
      <EmptyState
        icon="growth-readiness"
        title="Complete your assessment"
        action={
          <Link href="/growth-readiness">
            <Button>
              Start Assessment
              <SvgIcon name="arrow-right" size={16} color="white" />
            </Button>
          </Link>
        }
      >
        <p>
          Complete the Hbee Growth Readiness Assessment and we will review your
          business, identify your priorities, and prepare your Growth Profile.
        </p>
      </EmptyState>
    )
  }

  if (state === 'under_review') {
    return (
      <EmptyState
        icon="clock"
        title="Your assessment is with our team"
        action={
          <Link href="/client-portal">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        }
      >
        <p>
          We have your assessment and are reviewing your business. Your Growth
          Profile appears here once the review is complete and your place in the
          initiative is confirmed. We will email you either way.
        </p>
      </EmptyState>
    )
  }

  if (state === 'not_available') {
    return (
      <EmptyState
        icon="growth-profile"
        title="No Growth Profile available"
        action={
          <Link href="/contact">
            <Button variant="secondary">
              <SvgIcon name="email" size={16} />
              Contact Hbee Digitals
            </Button>
          </Link>
        }
      >
        <p>
          There is no Growth Profile available for this account at the moment. If
          you think that is wrong, please get in touch.
        </p>
      </EmptyState>
    )
  }

  if (state === 'error' || !profile) {
    return (
      <EmptyState
        icon="warning"
        title="Something went wrong"
        action={
          <>
            <Button onClick={fetchProfile}>Try Again</Button>
            <Link href="/client-portal">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
          </>
        }
      >
        <p>We could not load your Growth Profile. Please try again in a moment.</p>
      </EmptyState>
    )
  }

  const classification = profile.growth_classification || 'Foundation Stage'
  const emoji = CLASSIFICATION_EMOJIS[classification] || '📈'
  const colorClass =
    CLASSIFICATION_COLORS[classification] || 'border-gray-500/30 bg-gray-500/10'
  const textColor = CLASSIFICATION_TEXT_COLORS[classification] || 'text-gray-500'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Your Growth Profile</h1>
          <p className="text-[var(--text-secondary)]">
            View your Growth Readiness Index and personalized insights
          </p>
        </div>
        {profile.pdf_url && (
          <a
            href={profile.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-section)] hover:scale-[1.02]"
          >
            <SvgIcon name="download" size={16} color="var(--accent)" />
            Download PDF
          </a>
        )}
      </div>

      {/* HGRI Score Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex flex-shrink-0 flex-col items-center">
            <div className="text-5xl font-bold text-[var(--text-primary)]">
              {profile.hgri_score ?? 0}
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">HGRI™ Score</div>
          </div>

          <div className="hidden h-16 w-px bg-[var(--border)] md:block" />

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{emoji}</span>
              <div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${colorClass} ${textColor}`}
                >
                  {classification}
                </span>
              </div>
            </div>
            {profile.summary && (
              <p className="mt-2 text-[var(--text-secondary)]">{profile.summary}</p>
            )}
          </div>
        </div>
      </div>

      {/* Pillar Scores */}
      {profile.pillars && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Growth Pillars</h3>
          <div className="space-y-4">
            {Object.entries(profile.pillars).map(([pillar, score]) => {
              const label =
                PILLAR_LABELS[pillar] || pillar.charAt(0).toUpperCase() + pillar.slice(1)
              return (
                <div key={pillar}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {score}/100
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-section)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                      style={{ width: `${Math.min(score, 100)}%` }}
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
        {profile.strengths.length > 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="flex items-center gap-2">
              <SvgIcon name="check" size={20} color="#22C55E" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Strengths</h3>
            </div>
            <ul className="mt-3 space-y-2">
              {profile.strengths.map((strength, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                >
                  <span className="mt-1 text-green-500">•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {profile.opportunities.length > 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="flex items-center gap-2">
              <SvgIcon name="growth" size={20} color="#F97316" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Opportunities</h3>
            </div>
            <ul className="mt-3 space-y-2">
              {profile.opportunities.map((opportunity, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                >
                  <span className="mt-1 text-[var(--accent)]">•</span>
                  {opportunity}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {profile.recommendations.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center gap-2">
            <SvgIcon name="strategy" size={20} color="#3B82F6" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Growth Recommendations
            </h3>
          </div>
          <ul className="mt-3 space-y-3">
            {profile.recommendations.map((rec, index) => (
              <li
                key={index}
                className="flex items-start gap-3 text-sm text-[var(--text-secondary)]"
              >
                <span className="mt-1 flex-shrink-0 text-[var(--accent)]">{index + 1}.</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Steps */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Next Steps</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Your Growth Profile, recommendations and quarterly reviews stay free. When
          you are ready to implement, we can agree a scope.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/client-portal/project-request">
            <Button>
              <SvgIcon name="proposals" size={16} color="white" />
              Request Proposal
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="secondary">
              <SvgIcon name="chat" size={16} />
              Schedule Consultation
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
