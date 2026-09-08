// src/app/admin/proposals/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import {
  PROPOSAL_STATUSES,
  proposalStatusLabel,
  proposalStatusStyle,
} from '@/lib/proposal-status'

// Local, accurate shape of the row this list actually reads. The
// Proposal/ProposalStatus types in src/types/admin-crm.ts describe a different,
// stale model (business_name, project_title, investment, share_link…) that the
// live table and POST /api/admin/proposals do not use, so they are deliberately
// not imported here. That file is left untouched because its Lead/Task types
// are still used by other admin pages.
interface ProposalPricing {
  total?: number | string | null
  currency?: string | null
  payment_terms?: string | null
}

interface ProposalRow {
  id: string
  proposal_number: string | null
  title: string | null
  status: string | null
  timeline: string | null
  expires_at: string | null
  created_at: string
  merchant_id: string | null
  pricing: ProposalPricing | null
  merchant?: { business_name: string | null; contact_name: string | null; email: string | null } | null
  client?: { business_name: string | null; full_name: string | null; email: string | null } | null
}

function businessLabel(proposal: ProposalRow): string {
  return (
    proposal.merchant?.business_name ||
    proposal.client?.business_name ||
    proposal.client?.full_name ||
    proposal.merchant?.contact_name ||
    '—'
  )
}

function formatInvestment(pricing: ProposalPricing | null): string {
  const total = Number(pricing?.total)
  if (!Number.isFinite(total)) return '—'

  const currency = pricing?.currency || 'USD'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(total)
  } catch {
    // Unknown/invalid currency code — never let formatting break the row.
    return `${currency} ${total.toLocaleString()}`
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export default function AdminProposalsPage() {
  const supabase = createClientComponentClient()
  const [proposals, setProposals] = useState<ProposalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, sent: 0, approved: 0 })

  useEffect(() => {
    fetchProposals()
  }, [])

  async function fetchProposals() {
    setLoading(true)
    setLoadError(null)

    // Same relation shape the detail page already uses successfully. The create
    // route sets merchant_id only, so `client` may be null — both are optional
    // in the display helpers above.
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        merchant:merchants(business_name, contact_name, email),
        client:clients(business_name, full_name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      // Previously this failed silently and rendered an empty table, which is
      // exactly how the stale-field bug stayed invisible.
      console.error('Error fetching proposals:', error)
      setLoadError('Failed to load proposals. Please refresh and try again.')
      setProposals([])
      setStats({ total: 0, sent: 0, approved: 0 })
      setLoading(false)
      return
    }

    const rows = (data || []) as ProposalRow[]
    setProposals(rows)
    setStats({
      total: rows.length,
      sent: rows.filter((p) => p.status === 'sent' || p.status === 'viewed').length,
      approved: rows.filter((p) => p.status === 'approved').length,
    })

    setLoading(false)
  }

  const filteredProposals = proposals.filter((proposal) => {
    const q = search.trim().toLowerCase()
    const matchesSearch =
      q === '' ||
      (proposal.title?.toLowerCase().includes(q) ?? false) ||
      (proposal.proposal_number?.toLowerCase().includes(q) ?? false) ||
      businessLabel(proposal).toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Proposals</h1>
        <Link
          href="/admin/proposals/new"
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          + New Proposal
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
          <div className="text-sm text-[var(--text-muted)]">Total Proposals</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent)]">{stats.sent}</div>
          <div className="text-sm text-[var(--text-muted)]">Sent</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--success)]">{stats.approved}</div>
          <div className="text-sm text-[var(--text-muted)]">Approved</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <SvgIcon name="search" size={16} color="var(--text-muted)" className="absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search proposals..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="all">All Statuses</option>
            {PROPOSAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {proposalStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        {loadError && (
          <p role="alert" className="mt-3 text-sm text-red-500">
            {loadError}
          </p>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="pb-3 font-medium">Proposal</th>
                <th className="pb-3 font-medium">Client/Business</th>
                <th className="pb-3 font-medium">Investment</th>
                <th className="pb-3 font-medium">Timeline</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Expires</th>
                <th className="pb-3 font-medium">Created</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[var(--text-muted)]">
                    No proposals found
                  </td>
                </tr>
              ) : (
                filteredProposals.map((proposal) => (
                  <tr key={proposal.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-section)]">
                    <td className="py-3 font-medium text-[var(--text-primary)]">
                      {proposal.title || 'Untitled proposal'}
                      <p className="text-xs text-[var(--text-muted)]">{proposal.proposal_number || '—'}</p>
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">{businessLabel(proposal)}</td>
                    <td className="py-3 text-[var(--text-primary)]">
                      {formatInvestment(proposal.pricing)}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">{proposal.timeline || '—'}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${proposalStatusStyle(proposal.status)}`}
                      >
                        {proposalStatusLabel(proposal.status)}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">{formatDate(proposal.expires_at)}</td>
                    <td className="py-3 text-[var(--text-muted)]">{formatDate(proposal.created_at)}</td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/proposals/${proposal.id}`}
                        className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                      >
                        View
                        <SvgIcon name="arrow-right" size={12} color="var(--accent)" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
