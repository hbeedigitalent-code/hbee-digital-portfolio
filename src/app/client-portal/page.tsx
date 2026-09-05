// src/app/client-portal/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import StatsCard from '@/components/client-portal/StatsCard'
import EmptyState from '@/components/client-portal/EmptyState'
import SvgIcon from '@/components/ui/SvgIcon'
import Link from 'next/link'

interface Client {
  id: string
  full_name: string
  business_name: string
  email: string
  created_at: string
}

interface Project {
  id: string
  project_id: string
  project_name: string
  status: string
  progress: number
}

interface Request {
  id: string
  title: string
  status: string
  created_at: string
}

export default function ClientPortalDashboard() {
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [deliverables, setDeliverables] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
        setClient(clientData)

        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false })
        setProjects(projectData || [])

        const { data: requestData } = await supabase
          .from('project_requests')
          .select('*')
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false })
        setRequests(requestData || [])

        const { data: fileData } = await supabase
          .from('project_files')
          .select('*')
          .eq('client_id', clientData.id)
          .order('uploaded_at', { ascending: false })
        setFiles(fileData || [])

        // project_deliverables and project_invoices have no client_id column
        // — they are owned via project_id -> projects.id -> projects.client_id.
        // Reuse the project ids already fetched above (no extra round trip)
        // instead of re-querying; if that fetch returned nothing (including
        // on error, where projectData is left undefined), projectIds is
        // empty and both widgets render empty rather than ever running an
        // unscoped query that could show another client's rows.
        const projectIds = (projectData || []).map((p) => p.id)

        if (projectIds.length > 0) {
          const { data: deliverableData } = await supabase
            .from('project_deliverables')
            .select('*')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false })
          setDeliverables(deliverableData || [])

          const { data: invoiceData } = await supabase
            .from('project_invoices')
            .select('*')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false })
          setInvoices(invoiceData || [])
        } else {
          setDeliverables([])
          setInvoices([])
        }
      }
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  const activeProjects = projects.filter((p) => p.status !== 'Completed')
  const pendingRequests = requests.filter((r) => r.status === 'pending' || r.status === 'open')

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">
              Welcome back, {client?.full_name?.split(' ')[0] || 'Client'}!
            </h1>
            <p className="text-[var(--text-muted)]">
              {client?.business_name || 'Your business'} — Here's an overview of your projects
            </p>
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            Member since {client?.created_at ? new Date(client.created_at).toLocaleDateString() : 'Recently'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Active Projects" value={activeProjects.length} icon="projects" />
        <StatsCard
          title="Pending Requests"
          value={pendingRequests.length}
          icon="messages"
          color="var(--blue-500)"
          bgColor="var(--blue-500)/10"
        />
        <StatsCard title="Uploaded Files" value={files.length} icon="file" color="var(--text-primary)" bgColor="var(--bg-section)" />
        <StatsCard
          title="Deliverables"
          value={deliverables.length}
          icon="download"
          color="var(--accent-lime)"
          bgColor="var(--accent-lime)/10"
        />
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h2 className="mb-4 text-sm font-bold text-[var(--text-secondary)]">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/client-portal/files"
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            Upload File
          </Link>
          <Link
            href="/client-portal/requests"
            className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-section)]"
          >
            Submit Request
          </Link>
          <Link
            href="/client-portal/deliverables"
            className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-section)]"
          >
            View Deliverables
          </Link>
          <Link
            href="/client-portal/invoices"
            className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-section)]"
          >
            View Invoices
          </Link>
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-[var(--text-primary)]">Your Projects</h2>
          <Link href="/client-portal/projects" className="text-sm text-[var(--accent)] hover:underline">
            View All
          </Link>
        </div>
        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="You don't have any active projects. When you start a project, it will appear here."
            icon="projects"
            actionText="Contact Us"
            onAction={() => (window.location.href = '/contact')}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.slice(0, 4).map((project) => (
              <Link
                key={project.id}
                href={`/client-portal/projects/${project.id}`}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{project.project_name}</p>
                    <p className="text-sm text-[var(--text-muted)]">{project.project_id}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    project.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    project.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {project.status || 'New'}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Progress</span>
                    <span className="font-medium text-[var(--text-primary)]">{project.progress || 0}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--bg-section)]">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-lime)]"
                      style={{ width: `${project.progress || 0}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}