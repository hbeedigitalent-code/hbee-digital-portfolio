'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import { GrowthScore } from '@/types/growth-intelligence'

export default function GrowthIntelligencePage() {
  const [scores, setScores] = useState<GrowthScore[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    foundation: 0,
    potential: 0,
    ready: 0,
    scale: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)

    // /api/admin/growth-intelligence verifies session, user-bound admin 2FA and
    // active admin membership before reading growth_scores.
    try {
      const response = await fetch('/api/admin/growth-intelligence', {
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !Array.isArray(payload?.scores)) {
        setLoadError(payload?.error || 'Could not load growth intelligence. Please refresh and try again.')
        setScores([])
        return
      }

      setLoadError(null)
      setScores(payload.scores)
      setStats(payload.stats)
    } catch (error) {
      console.error('Error:', error)
      setLoadError('Could not load growth intelligence. Please refresh and try again.')
      setScores([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
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
          Could not load growth intelligence
        </h2>
        <p className="mt-2 max-w-md text-[var(--text-secondary)]">{loadError}</p>
        <button
          type="button"
          onClick={fetchData}
          className="mt-6 rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Growth Intelligence</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/growth-intelligence/audits/new"
            className="rounded-full bg-[var(--accent-orange)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
          >
            + New Audit
          </Link>
          <Link
            href="/admin/growth-intelligence/reports"
            className="rounded-full border border-[var(--border)] bg-transparent px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--bg-navy-mid)]"
          >
            Generate Report
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-[var(--text-muted)]">Total Businesses</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">{stats.foundation}</div>
          <div className="text-sm text-[var(--text-muted)]">Foundation</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.potential}</div>
          <div className="text-sm text-[var(--text-muted)]">Growth Potential</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.ready}</div>
          <div className="text-sm text-[var(--text-muted)]">Growth Ready</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent-lime)]">{stats.scale}</div>
          <div className="text-sm text-[var(--text-muted)]">Scale Ready</div>
        </div>
      </div>

      {/* Score Cards */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="pb-3 font-medium">Business</th>
                <th className="pb-3 font-medium">Visibility</th>
                <th className="pb-3 font-medium">Conversion</th>
                <th className="pb-3 font-medium">Retention</th>
                <th className="pb-3 font-medium">Authority</th>
                <th className="pb-3 font-medium">Scalability</th>
                <th className="pb-3 font-medium">Overall</th>
                <th className="pb-3 font-medium">Classification</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {scores.slice(0, 10).map((score) => (
                <tr key={score.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-card-dark)]/50">
                  <td className="py-3 font-medium text-white">
                    Merchant #{score.merchant_id?.slice(0, 8) || 'N/A'}
                  </td>
                  <td className="py-3 text-[var(--text-muted)]">{score.visibility_score}</td>
                  <td className="py-3 text-[var(--text-muted)]">{score.conversion_score}</td>
                  <td className="py-3 text-[var(--text-muted)]">{score.retention_score}</td>
                  <td className="py-3 text-[var(--text-muted)]">{score.authority_score}</td>
                  <td className="py-3 text-[var(--text-muted)]">{score.scalability_score}</td>
                  <td className="py-3 font-bold text-white">{score.overall_score}%</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      score.classification === 'Scale Ready' ? 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]' :
                      score.classification === 'Growth Ready' ? 'bg-blue-500/20 text-blue-400' :
                      score.classification === 'Growth Potential' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {score.classification}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/admin/growth-intelligence/${score.id}`}
                      className="inline-flex items-center gap-1 text-[var(--accent-orange)] hover:underline"
                    >
                      View
                      <SvgIcon name="arrow-right" size={12} color="var(--accent-orange)" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}