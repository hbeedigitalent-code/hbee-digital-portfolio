// src/app/admin/growth-reviews/page.tsx

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MerchantLifecycleService } from '@/lib/services/merchant-lifecycle'
import StatusBadge from '@/components/ui/StatusBadge'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

export default function AdminGrowthReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchReviews()
  }, [filter])

  async function fetchReviews() {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/growth-reviews?status=${encodeURIComponent(filter)}`,
        { credentials: 'same-origin' },
      )
      const payload = await response.json().catch(() => null)

      if (!response.ok || !Array.isArray(payload?.reviews)) {
        setLoadError(payload?.error || 'Could not load assessments. Please refresh and try again.')
        setReviews([])
        return
      }

      setLoadError(null)
      setReviews(payload.reviews)
    } catch (error) {
      console.error('Error:', error)
      setLoadError('Could not load assessments. Please refresh and try again.')
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusCounts = () => {
    const counts: Record<string, number> = { all: reviews.length }
    reviews.forEach((review) => {
      counts[review.status] = (counts[review.status] || 0) + 1
    })
    return counts
  }

  const statusCounts = getStatusCounts()

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <SvgIcon name="warning" size={48} color="var(--error)" />
        <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
          Could not load assessments
        </h2>
        <p className="mt-2 max-w-md text-[var(--text-secondary)]">{loadError}</p>
        <Button className="mt-6" onClick={fetchReviews}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Growth Reviews</h1>
          <p className="text-[var(--text-secondary)]">Review and manage growth assessments</p>
        </div>
        <Link href="/admin/growth-assessments">
          <Button variant="secondary">
            <SvgIcon name="growth-readiness" size={16} />
            View All Assessments
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-4">
        {['all', 'pending', 'in_progress', 'completed'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition ${
              filter === tab
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-section)]'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-2 text-xs opacity-60">({statusCounts[tab] || 0})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <SvgIcon name="search" size={18} color="var(--text-muted)" className="absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by business name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
          <SvgIcon name="growth-readiness" size={48} color="var(--text-muted)" />
          <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">No reviews found</h3>
          <p className="text-[var(--text-secondary)]">
            {filter === 'all' 
              ? 'No growth reviews have been created yet.' 
              : `No ${filter} reviews found.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-section)]">
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Business</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">HGRI</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Submitted</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews
                .filter((review) => {
                  if (!search) return true
                  const businessName = review.merchant?.business_name || ''
                  const email = review.merchant?.email || ''
                  return businessName.toLowerCase().includes(search.toLowerCase()) ||
                         email.toLowerCase().includes(search.toLowerCase())
                })
                .map((review) => (
                  <tr key={review.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-card-hover)] transition-colors last:border-0">
                    <td className="px-4 py-4">
                      <div className="font-medium text-[var(--text-primary)]">
                        {review.merchant?.business_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-[var(--text-muted)]">
                        {review.merchant?.email}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={review.status} />
                    </td>
                    <td className="px-4 py-4">
                      {review.hgri_score ? (
                        <span className="font-bold text-[var(--text-primary)]">{review.hgri_score}</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--text-secondary)]">
                      {new Date(review.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link href={`/admin/growth-reviews/${review.id}`}>
                        <Button size="sm">
                          <SvgIcon name="eye" size={14} color="white" />
                          Review
                        </Button>
                      </Link>
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