// src/app/admin/client-health/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface ClientHealth {
  id: string
  full_name: string
  business_name: string
  email: string
  project_id: string
  project_name: string
  project_status: string
  progress: number
  last_login: string | null
  last_reply: string | null
  pending_requests: number
  invoice_status: string
  risk_level: string
}

export default function AdminClientHealthPage() {
  const supabase = createClientComponentClient()
  const [clients, setClients] = useState<ClientHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [riskFilter, setRiskFilter] = useState('all')
  const [stats, setStats] = useState({ low: 0, medium: 0, high: 0 })

  useEffect(() => {
    fetchClientHealth()
  }, [])

  async function fetchClientHealth() {
    setLoading(true)

    // /api/admin/clients?view=health verifies session, user-bound admin 2FA
    // and active admin membership before reading clients.
    const response = await fetch('/api/admin/clients?view=health', {
      credentials: 'same-origin',
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok || !Array.isArray(payload?.clients)) {
      setLoadError(payload?.error || 'Could not load client health. Please refresh and try again.')
      setLoading(false)
      return
    }

    setLoadError(null)
    const clientData = payload.clients

    if (clientData) {
      const healthData: ClientHealth[] = []

      for (const client of clientData) {
        if (client.projects && client.projects.length > 0) {
          for (const project of client.projects) {
            const { count: requestCount } = await supabase
              .from('project_requests')
              .select('*', { count: 'exact', head: true })
              .eq('project_id', project.id)
              .eq('status', 'open')

            let riskLevel = 'Low'
            if (project.status === 'Awaiting Client Feedback') {
              riskLevel = 'High'
            } else if (project.progress < 30 && project.status !== 'Onboarding') {
              riskLevel = 'Medium'
            }

            healthData.push({
              id: client.id,
              full_name: client.full_name,
              business_name: client.business_name,
              email: client.email,
              project_id: project.project_id,
              project_name: project.project_name,
              project_status: project.status,
              progress: project.progress || 0,
              last_login: null,
              last_reply: null,
              pending_requests: requestCount || 0,
              invoice_status: 'Paid',
              risk_level: riskLevel
            })
          }
        }
      }

      setClients(healthData)
      
      const low = healthData.filter(c => c.risk_level === 'Low').length
      const medium = healthData.filter(c => c.risk_level === 'Medium').length
      const high = healthData.filter(c => c.risk_level === 'High').length
      setStats({ low, medium, high })
    }

    setLoading(false)
  }

  const filteredClients = riskFilter === 'all' 
    ? clients 
    : clients.filter(c => c.risk_level === riskFilter)

  const riskColors: Record<string, string> = {
    'Low': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
    'Medium': 'bg-yellow-500/20 text-yellow-500',
    'High': 'bg-red-500/20 text-red-500',
  }

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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Client Health</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent-lime)]">{stats.low}</div>
          <div className="text-sm text-[var(--text-muted)]">Low Risk</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-yellow-500">{stats.medium}</div>
          <div className="text-sm text-[var(--text-muted)]">Medium Risk</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{stats.high}</div>
          <div className="text-sm text-[var(--text-muted)]">High Risk</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <option value="all">All Risk Levels</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="pb-3 font-medium">Client</th>
                <th className="pb-3 font-medium">Project</th>
                <th className="pb-3 font-medium">Progress</th>
                <th className="pb-3 font-medium">Requests</th>
                <th className="pb-3 font-medium">Risk</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                    No clients found
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={`${client.id}-${client.project_id}`} className="border-b border-[var(--border)] hover:bg-[var(--bg-section)]">
                    <td className="py-3 font-medium text-[var(--text-primary)]">
                      {client.full_name}
                      <p className="text-xs text-[var(--text-muted)]">{client.business_name}</p>
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {client.project_name}
                      <p className="text-xs text-[var(--text-muted)]">{client.project_status}</p>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-[var(--bg-section)]">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-lime)]"
                            style={{ width: `${client.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">{client.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {client.pending_requests}
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${riskColors[client.risk_level]}`}>
                        {client.risk_level}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/client-portal/${client.id}`}
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