// src/app/client-portal/projects/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'
import StatusBadge from '@/components/client-portal/StatusBadge'
import Link from 'next/link'

interface Project {
  id: string
  project_id: string
  project_name: string
  status: string
  progress: number
  description: string
  start_date: string
  expected_completion_date: string
}

interface Milestone {
  id: string
  title: string
  description: string
  status: string
  due_date: string
}

export default function ClientProjectDetailPage() {
  const params = useParams()
  const supabase = createClientComponentClient()
  const [project, setProject] = useState<Project | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjectDetail()
  }, [])

  async function fetchProjectDetail() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Get client
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
        // Get project
        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', params.id)
          .eq('client_id', clientData.id)
          .maybeSingle()

        if (projectData) {
          setProject(projectData)

          // Get milestones
          const { data: milestoneData } = await supabase
            .from('project_milestones')
            .select('*')
            .eq('project_id', projectData.id)
            .order('due_date', { ascending: true })

          setMilestones(milestoneData || [])
        }
      }
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <SvgIcon name="warning" size={48} color="var(--text-muted)" />
        <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">Project Not Found</h2>
        <p className="text-[var(--text-muted)]">The project you're looking for doesn't exist or you don't have access.</p>
        <Link href="/client-portal/projects" className="mt-4 rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]">
          Back to Projects
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/client-portal/projects"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
      >
        <SvgIcon name="chevron-left" size={16} />
        Back to Projects
      </Link>

      {/* Project Header */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{project.project_name}</h1>
            <p className="text-sm text-[var(--text-muted)]">{project.project_id}</p>
            {project.description && (
              <p className="mt-3 text-[var(--text-secondary)]">{project.description}</p>
            )}
          </div>
          <StatusBadge status={project.status || 'New'} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Start Date</p>
            <p className="font-medium text-[var(--text-primary)]">
              {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Expected Completion</p>
            <p className="font-medium text-[var(--text-primary)]">
              {project.expected_completion_date ? new Date(project.expected_completion_date).toLocaleDateString() : 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Progress</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-[var(--bg-section)]">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)]"
                  style={{ width: `${project.progress || 0}%` }}
                />
              </div>
              <span className="font-medium text-[var(--text-primary)]">{project.progress || 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Milestones</h2>
        {milestones.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">No milestones yet</p>
        ) : (
          <div className="mt-4 space-y-3">
            {milestones.map((milestone) => (
              <div key={milestone.id} className="flex items-center justify-between border-b border-[var(--border)] pb-3 last:border-0">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{milestone.title}</p>
                  {milestone.description && (
                    <p className="text-sm text-[var(--text-muted)]">{milestone.description}</p>
                  )}
                  <p className="text-xs text-[var(--text-muted)]">
                    Due: {new Date(milestone.due_date).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={milestone.status || 'pending'} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}