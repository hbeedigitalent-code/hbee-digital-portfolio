// src/app/admin/client-portal/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Client {
  id: string
  full_name: string
  email: string
  business_name: string
  website_url: string
  status: string
  created_at: string
  projects?: { id: string; project_id: string; status: string }[]
}

export default function AdminClientPortalPage() {
  const supabase = createClientComponentClient()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 })

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    setLoading(true)

    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        projects (id, project_id, status)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setClients(data)
      
      const total = data.length
      const active = data.filter((c: any) => c.status === 'Active').length
      const inactive = data.filter((c: any) => c.status !== 'Active').length
      
      setStats({ total, active, inactive })
    }

    setLoading(false)
  }

  const statusColors: Record<string, string> = {
    'Active': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
    'Inactive': 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]',
    'Pending': 'bg-[var(--warning-subtle)] text-[var(--warning)]',
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Client Portal</h1>
        <div className="text-sm text-[var(--text-muted)]">
          {clients.length} total clients
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
          <div className="text-sm text-[var(--text-muted)]">Total Clients</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent-lime)]">{stats.active}</div>
          <div className="text-sm text-[var(--text-muted)]">Active</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--text-muted)]">{stats.inactive}</div>
          <div className="text-sm text-[var(--text-muted)]">Inactive</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="pb-3 font-medium">Client</th>
                <th className="pb-3 font-medium">Business</th>
                <th className="pb-3 font-medium">Projects</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Joined</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                    No clients found
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-section)]">
                    <td className="py-3 font-medium text-[var(--text-primary)]">
                      {client.full_name}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {client.business_name}
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {client.projects?.length || 0}
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[client.status] || 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]'}`}>
                        {client.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {new Date(client.created_at).toLocaleDateString()}
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