// src/app/admin/merchants/page.tsx
//
// Restyled to the established admin list pattern, matching
// src/app/admin/growth-reviews/page.tsx (card-wrapped table, tinted header row,
// centred empty/error states) and src/app/admin/proposals/page.tsx (stat tiles,
// search + status filter row).
//
// Every colour is now a semantic theme token. The previous version hard-coded
// `text-white`, `text-yellow-400`, `bg-gray-500/20 text-gray-400` and
// `bg-[var(--accent-lime)]/20` — the first is invisible on the light theme, and
// --accent-lime is the deprecated alias for --cta, so "active" merchants were
// badged in the CTA orange rather than a success colour.
//
// Data, stats, the API call and the authentication behaviour are unchanged:
// /api/admin/merchants still verifies session, user-bound admin 2FA and active
// admin membership, and the tiles still come from the server's `stats` object.
// Filtering is client-side over the rows already returned; it issues no new
// request and changes no query parameter.

'use client'

import { useEffect, useMemo, useState } from 'react'
import SvgIcon from '@/components/ui/SvgIcon'
import StatusBadge from '@/components/ui/StatusBadge'
import Button from '@/components/ui/Button'

interface Merchant {
  id: string
  business_name: string
  contact_name: string
  email: string
  whatsapp: string
  website_url: string
  country: string
  industry: string
  status: string
  email_verified: boolean
  created_at: string
}

const STATUS_FILTERS = ['all', 'active', 'pending'] as const

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchMerchants()
  }, [])

  async function fetchMerchants() {
    setLoading(true)

    // /api/admin/merchants verifies session, user-bound admin 2FA and active
    // admin membership before reading merchant_accounts.
    try {
      const response = await fetch('/api/admin/merchants', { credentials: 'same-origin' })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !Array.isArray(payload?.merchants)) {
        setLoadError(payload?.error || 'Could not load merchants. Please refresh and try again.')
        setMerchants([])
        return
      }

      setLoadError(null)
      setMerchants(payload.merchants)
      setStats(payload.stats)
    } catch (error) {
      console.error('Error:', error)
      setLoadError('Could not load merchants. Please refresh and try again.')
      setMerchants([])
    } finally {
      setLoading(false)
    }
  }

  // Client-side only. The server response is never re-requested or narrowed.
  const filteredMerchants = useMemo(() => {
    const q = search.trim().toLowerCase()
    return merchants.filter((merchant) => {
      const matchesSearch =
        q === '' ||
        (merchant.business_name?.toLowerCase().includes(q) ?? false) ||
        (merchant.contact_name?.toLowerCase().includes(q) ?? false) ||
        (merchant.email?.toLowerCase().includes(q) ?? false)
      const matchesStatus = statusFilter === 'all' || merchant.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [merchants, search, statusFilter])

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
      <div className="flex min-h-[400px] flex-col items-center justify-center px-4 text-center">
        <SvgIcon name="x-circle" size={48} color="var(--error)" />
        <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
          Could not load merchants
        </h2>
        <p className="mt-2 max-w-md text-[var(--text-secondary)]">{loadError}</p>
        <Button className="mt-6" onClick={fetchMerchants}>
          Try Again
        </Button>
      </div>
    )
  }

  const isFiltered = search.trim() !== '' || statusFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Merchants</h1>
          <p className="text-[var(--text-secondary)]">
            Merchant accounts registered through signup
          </p>
        </div>
        <div className="text-sm text-[var(--text-muted)]">
          {merchants.length} total {merchants.length === 1 ? 'merchant' : 'merchants'}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
          <div className="text-sm text-[var(--text-muted)]">Total</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--warning)]">{stats.pending}</div>
          <div className="text-sm text-[var(--text-muted)]">Pending</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--success)]">{stats.active}</div>
          <div className="text-sm text-[var(--text-muted)]">Active</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <SvgIcon
            name="search"
            size={16}
            color="var(--text-muted)"
            className="absolute left-3 top-1/2 -translate-y-1/2"
          />
          <label htmlFor="merchant-search" className="sr-only">
            Search merchants
          </label>
          <input
            id="merchant-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business, contact or email..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </div>
        <label htmlFor="merchant-status" className="sr-only">
          Filter by status
        </label>
        <select
          id="merchant-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {STATUS_FILTERS.map((value) => (
            <option key={value} value={value}>
              {value === 'all' ? 'All Statuses' : value.charAt(0).toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Table / empty state */}
      {filteredMerchants.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
          <SvgIcon name="users" size={48} color="var(--text-muted)" />
          <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
            {isFiltered ? 'No matching merchants' : 'No merchants found'}
          </h3>
          <p className="mt-1 text-[var(--text-secondary)]">
            {isFiltered
              ? 'No merchant accounts match the current search or status filter.'
              : 'No merchant accounts have been registered yet.'}
          </p>
          {isFiltered && (
            <Button
              variant="secondary"
              className="mt-6"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-section)]">
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                  Business
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMerchants.map((merchant) => (
                <tr
                  key={merchant.id}
                  className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--bg-card-hover)]"
                >
                  <td className="px-4 py-4 font-medium text-[var(--text-primary)]">
                    {merchant.business_name || '—'}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--text-secondary)]">
                    {merchant.contact_name || '—'}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--text-secondary)]">
                    {merchant.email || '—'}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={merchant.status || 'pending'} />
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--text-secondary)]">
                    {formatDate(merchant.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
