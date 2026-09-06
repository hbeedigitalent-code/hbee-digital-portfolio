// src/app/client-portal/projects/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SvgIcon from '@/components/ui/SvgIcon'
import StatusPill from '@/components/ui/StatusPill'

interface Project {
  id: string
  project_id: string
  project_name: string
  status: string
  progress: number
  description: string
  created_at: string
}

export default function ClientProjectsPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false })
        setProjects(projectData || [])
      }
    }

    setLoading(false)
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Your Projects</h1>
          <p className="text-sm text-[var(--text-muted)]">Track the progress of your projects</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Quick Project Request Button */}
          <Link
            href="/client-portal/project-request"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <SvgIcon name="plus" size={16} color="white" />
            Request New Project
          </Link>
          {/* Full Onboarding Button */}
          <Link
            href="/client-onboarding"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-6 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-section)]"
          >
            <SvgIcon name="file" size={16} color="var(--text-muted)" />
            Full Onboarding
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-section)]">
            <SvgIcon name="projects" size={32} color="var(--text-muted)" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">No projects yet</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Start by requesting a new project. Our team will review and get back to you.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/client-portal/project-request"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <SvgIcon name="plus" size={16} color="white" />
              Quick Request
            </Link>
            <Link
              href="/client-onboarding"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-6 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-section)]"
            >
              <SvgIcon name="file" size={16} color="var(--text-muted)" />
              Full Onboarding
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/client-portal/projects/${project.id}`}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{project.project_name}</p>
                  <p className="text-sm text-[var(--text-muted)]">{project.project_id}</p>
                </div>
                <StatusPill status={project.status || 'New'} />
              </div>

              {project.description && (
                <p className="mt-2 text-sm text-[var(--text-muted)] line-clamp-2">{project.description}</p>
              )}

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

              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Created: {new Date(project.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}