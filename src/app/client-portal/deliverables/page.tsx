// src/app/client-portal/deliverables/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'
import EmptyState from '@/components/client-portal/EmptyState'
import StatusBadge from '@/components/client-portal/StatusBadge'

interface Deliverable {
  id: string
  title: string
  description: string
  file_url: string
  version: string
  status: string
  uploaded_at: string
}

export default function ClientDeliverablesPage() {
  const supabase = createClientComponentClient()
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDeliverables()
  }, [])

  async function fetchDeliverables() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
        // project_deliverables has no client_id column — it is owned via
        // project_deliverables.project_id -> projects.id -> projects.client_id.
        // Resolve this client's own project ids first so a failed or empty
        // project lookup can never fall through to an unscoped read.
        const { data: myProjects, error: projectsError } = await supabase
          .from('projects')
          .select('id')
          .eq('client_id', clientData.id)

        const projectIds = projectsError ? [] : (myProjects || []).map((p) => p.id)

        if (projectIds.length > 0) {
          const { data: deliverableData } = await supabase
            .from('project_deliverables')
            .select('*')
            .in('project_id', projectIds)
            .order('uploaded_at', { ascending: false })
          setDeliverables(deliverableData || [])
        } else {
          setDeliverables([])
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Deliverables</h1>
        <p className="text-[var(--text-muted)]">Access your project deliverables and files</p>
      </div>

      {deliverables.length === 0 ? (
        <EmptyState
          title="No deliverables yet"
          description="Your project deliverables will appear here once they're ready."
          icon="download"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {deliverables.map((d) => (
            <div key={d.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{d.title}</h3>
                  {d.description && (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{d.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span>Version {d.version || '1.0'}</span>
                    <span>•</span>
                    <span>{new Date(d.uploaded_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <StatusBadge status={d.status || 'ready'} />
              </div>

              {d.file_url && (
                <div className="mt-4">
                  <a
                    href={d.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
                  >
                    <SvgIcon name="download" size={16} color="white" />
                    Download
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}