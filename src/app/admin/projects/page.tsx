// src/app/admin/projects/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Project {
  id: string
  project_id: string
  project_name: string
  status: string
  progress: number
  client_id: string
  clients?: { business_name: string; full_name: string }
  created_at: string
}

const statusColors: Record<string, string> = {
  'Pending Review': 'bg-[var(--warning-subtle)] text-[var(--warning)]',
  'Active': 'bg-[var(--success-subtle)] text-[var(--success)]',
  'In Progress': 'bg-[var(--accent-subtle)] text-[var(--accent)]',
  'Awaiting Client': 'bg-[var(--accent-subtle)] text-[var(--accent)]',
  'Completed': 'bg-[var(--success-subtle)] text-[var(--success)]',
  'Paused': 'bg-[var(--bg-section)] text-[var(--text-secondary)]',
}

export default function AdminProjectsPage() {
  const supabase = createClientComponentClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 })

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    setLoading(true)

    // Client-project management only. `projects` is a shared table that also
    // holds public portfolio/showcase rows (status published/draft, no
    // client_id); those must not appear here or inflate the metrics below.
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        clients (business_name, full_name)
      `)
      .not('client_id', 'is', null)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setProjects(data as Project[])
      const total = data.length
      const active = data.filter((p: any) => p.status !== 'Completed' && p.status !== 'Archived').length
      const completed = data.filter((p: any) => p.status === 'Completed').length
      setStats({ total, active, completed })
    }

    setLoading(false)
  }

  const filteredProjects = projects.filter(project => {
    const q = search.trim().toLowerCase()
    const matchesSearch =
      q === '' ||
      (project.project_name?.toLowerCase().includes(q) ?? false) ||
      (project.project_id?.toLowerCase().includes(q) ?? false) ||
      (project.clients?.business_name?.toLowerCase().includes(q) ?? false)
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Projects</h1>
        <Link
          href="/admin/projects/new"
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          + New Project
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
          <div className="text-sm text-[var(--text-muted)]">Total Projects</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent)]">{stats.active}</div>
          <div className="text-sm text-[var(--text-muted)]">Active</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent-lime)]">{stats.completed}</div>
          <div className="text-sm text-[var(--text-muted)]">Completed</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <label htmlFor="admin-project-search" className="sr-only">Search projects</label>
            <SvgIcon name="search" size={16} color="var(--text-muted)" className="absolute left-3 top-2.5" />
            <input
              id="admin-project-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <label htmlFor="admin-project-status-filter" className="sr-only">Filter projects by status</label>
          <select
            id="admin-project-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="all">All Statuses</option>
            {Object.keys(statusColors).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="pb-3 font-medium">Project</th>
                <th className="pb-3 font-medium">Client</th>
                <th className="pb-3 font-medium">Progress</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Created</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                    No projects found
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-section)]">
                    <td className="py-3 font-medium text-[var(--text-primary)]">
                      {project.project_name}
                      <p className="text-xs text-[var(--text-muted)]">{project.project_id}</p>
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {project.clients?.business_name || 'N/A'}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-[var(--bg-section)]">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-lime)]"
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">{project.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[project.status] || 'bg-[var(--bg-section)] text-[var(--text-secondary)]'}`}>
                        {project.status || 'New'}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {new Date(project.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/projects/${project.id}`}
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