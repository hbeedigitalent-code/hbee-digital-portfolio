// src/app/admin/growth-profiles/page.tsx

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

export default function AdminGrowthProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchProfiles()
  }, [filter])

  async function fetchProfiles() {
    setLoading(true)
    try {
      // /api/admin/growth-profiles verifies session, user-bound admin 2FA and
      // active admin membership before reading growth_profiles.
      const response = await fetch(
        `/api/admin/growth-profiles?filter=${encodeURIComponent(filter)}`,
        { credentials: 'same-origin' },
      )
      const payload = await response.json().catch(() => null)

      if (!response.ok || !Array.isArray(payload?.profiles)) {
        setLoadError(payload?.error || 'Could not load profiles. Please refresh and try again.')
        setProfiles([])
        return
      }

      setLoadError(null)
      setProfiles(payload.profiles)
    } catch (error) {
      console.error('Error:', error)
      setLoadError('Could not load profiles. Please refresh and try again.')
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }

  async function toggleProfileStatus(profileId: string, currentStatus: boolean) {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'archive' : 'activate'} this profile?`)) return

    try {
      const response = await fetch(`/api/admin/growth-profiles/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        alert(payload?.error || 'Failed to update profile status.')
        return
      }

      await fetchProfiles()
    } catch (error) {
      console.error('Error:', error)
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
          Could not load growth profiles
        </h2>
        <p className="mt-2 max-w-md text-[var(--text-secondary)]">{loadError}</p>
        <button
          type="button"
          onClick={fetchProfiles}
          className="mt-6 rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    )
  }

  const getStatusCounts = () => {
    const counts: Record<string, number> = { all: profiles.length }
    profiles.forEach((profile) => {
      const key = profile.is_active ? 'active' : 'archived'
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Growth Profiles</h1>
          <p className="text-[var(--text-secondary)]">View and manage all generated growth profiles</p>
        </div>
        <Link href="/admin/growth-assessments">
          <Button variant="secondary">
            <SvgIcon name="growth-readiness" size={16} />
            View Assessments
          </Button>
        </Link>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{profiles.length}</div>
          <div className="text-xs text-[var(--text-muted)]">Total Profiles</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-green-500">
            {profiles.filter(p => p.is_active).length}
          </div>
          <div className="text-xs text-[var(--text-muted)]">Active</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">
            {profiles.filter(p => p.hgri_score >= 70).length}
          </div>
          <div className="text-xs text-[var(--text-muted)]">High Performers (70+)</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-purple-500">
            {profiles.filter(p => p.growth_classification === 'Scale Ready' || p.growth_classification === 'Growth Ready').length}
          </div>
          <div className="text-xs text-[var(--text-muted)]">Growth Ready</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-4">
        {['all', 'active', 'archived'].map((tab) => (
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

      {/* Profiles List */}
      {profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
          <SvgIcon name="growth-profile" size={48} color="var(--text-muted)" />
          <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">No profiles found</h3>
          <p className="text-[var(--text-secondary)]">
            {filter === 'all' 
              ? 'No growth profiles have been generated yet.' 
              : `No ${filter} profiles found.`}
          </p>
          <Link href="/admin/growth-assessments">
            <Button className="mt-6">
              <SvgIcon name="growth-readiness" size={16} color="white" />
              Review Assessments
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-section)]">
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Business</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Classification</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">HGRI</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Created</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles
                .filter((profile) => {
                  if (!search) return true
                  const businessName = profile.merchant?.business_name || ''
                  const email = profile.merchant?.email || ''
                  return businessName.toLowerCase().includes(search.toLowerCase()) ||
                         email.toLowerCase().includes(search.toLowerCase())
                })
                .map((profile) => {
                  const classificationColor = getClassificationColor(profile.growth_classification)
                  return (
                    <tr key={profile.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-card-hover)] transition-colors last:border-0">
                      <td className="px-4 py-4">
                        <div className="font-medium text-[var(--text-primary)]">
                          {profile.merchant?.business_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-[var(--text-muted)]">
                          {profile.merchant?.email}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${classificationColor}`}>
                          {profile.growth_classification || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`font-bold ${
                          profile.hgri_score >= 70 ? 'text-green-500' :
                          profile.hgri_score >= 50 ? 'text-yellow-500' :
                          'text-red-500'
                        }`}>
                          {profile.hgri_score || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={profile.is_active ? 'active' : 'archived'} />
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--text-secondary)]">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/growth-profiles/${profile.id}`}>
                            <Button size="sm">
                              <SvgIcon name="eye" size={14} color="white" />
                              View
                            </Button>
                          </Link>
                          <button
                            onClick={() => toggleProfileStatus(profile.id, profile.is_active)}
                            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            {profile.is_active ? 'Archive' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}