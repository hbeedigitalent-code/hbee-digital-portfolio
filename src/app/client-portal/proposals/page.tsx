// src/app/client-portal/proposals/page.tsx
//
// Client proposal index.
//
// Like the detail page, this never touches Supabase: it reads only
// /api/client-portal/proposals, which resolves the caller's clients.id
// server-side and returns nothing but delivered proposals belonging to them.
// There are no writes of any kind on this page, and createNotification.ts is
// never imported.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import StatusPill from '@/components/ui/StatusPill'
import { proposalStatusLabel } from '@/lib/proposal-status'

interface ProposalPricing {
  total?: number | string | null
  currency?: string | null
}

interface ProposalListItem {
  id: string
  proposal_number: string | null
  title: string | null
  status: string
  pricing: ProposalPricing | null
  expires_at: string | null
  sent_at: string | null
  created_at: string
  merchant?: { business_name: string | null } | null
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]'

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function formatMoney(pricing: ProposalPricing | null): string {
  const total = Number(pricing?.total)
  if (!Number.isFinite(total)) return '—'
  const currency = pricing?.currency || 'USD'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(total)
  } catch {
    return `${currency} ${total.toLocaleString()}`
  }
}

/** True when the proposal has an expiry date already in the past. */
function isExpired(value: string | null | undefined): boolean {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now()
}

export default function ClientProposalsPage() {
  const [proposals, setProposals] = useState<ProposalListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProposals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/client-portal/proposals', {
        credentials: 'same-origin',
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !Array.isArray(payload?.proposals)) {
        setError('Could not load your proposals. Please refresh and try again.')
        return
      }

      setProposals(payload.proposals as ProposalListItem[])
    } catch (err) {
      console.error('Error:', err)
      setError('Could not load your proposals. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Your Proposals</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Review proposals from Hbee Digitals, then approve or request changes
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-section)]">
            <SvgIcon name="warning" size={28} color="var(--text-muted)" />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          <button
            type="button"
            onClick={fetchProposals}
            className={`mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] ${FOCUS_RING}`}
          >
            Try Again
          </button>
        </div>
      ) : proposals.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-section)]">
            <SvgIcon name="services" size={32} color="var(--text-muted)" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">No proposals yet</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            When Hbee Digitals sends you a proposal, it will appear here for review.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {proposals.map((proposal) => (
            <Link
              key={proposal.id}
              href={`/client-portal/proposals/${proposal.id}`}
              className={`group flex flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:border-[var(--accent-orange)] ${FOCUS_RING}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {proposal.proposal_number || 'Proposal'}
                  </p>
                  <h3 className="mt-1 truncate text-base font-semibold text-[var(--text-primary)]">
                    {proposal.title || 'Untitled proposal'}
                  </h3>
                  {proposal.merchant?.business_name && (
                    <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                      {proposal.merchant.business_name}
                    </p>
                  )}
                </div>
                <StatusPill status={proposalStatusLabel(proposal.status)} size="sm" />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <dt className="text-[var(--text-muted)]">Total</dt>
                  <dd className="mt-0.5 font-semibold text-[var(--text-primary)]">
                    {formatMoney(proposal.pricing)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">
                    {proposal.sent_at ? 'Sent' : 'Created'}
                  </dt>
                  <dd className="mt-0.5 text-[var(--text-secondary)]">
                    {formatDate(proposal.sent_at || proposal.created_at)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[var(--text-muted)]">Expires</dt>
                  <dd
                    className={`mt-0.5 ${
                      isExpired(proposal.expires_at)
                        ? 'font-semibold text-[var(--error)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {formatDate(proposal.expires_at)}
                    {isExpired(proposal.expires_at) && ' (past due)'}
                  </dd>
                </div>
              </dl>

              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-orange)]">
                View proposal
                <SvgIcon name="arrow-right" size={14} color="var(--accent-orange)" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
