// src/app/admin/projects/new/page.tsx
//
// Admin project creation. Its existence is also the fix for the routing bug:
// with no static `new` segment, /admin/projects/new fell through to
// /admin/projects/[project_id], which cast "new" to a uuid, got 22P02 back and
// silently redirected to the list. A real page here takes precedence over the
// dynamic segment.
//
// The client list is read with the session Supabase client under RLS — the
// same pattern /admin/client-portal already uses — so no service-role
// credential reaches the browser. Creation itself goes through
// POST /api/admin/projects, which re-verifies session + 2FA + active-admin and
// generates the project reference server-side.
//
// No file upload here by design: files stay a separate workflow that runs
// after the project exists, and /api/admin/projects/new/files is never called.

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

interface ClientOption {
  id: string
  full_name: string | null
  business_name: string | null
  email: string | null
}

const SERVICES = [
  'Website Development',
  'Ecommerce Development',
  'Shopify Optimization',
  'UI/UX Design',
  'Digital Marketing',
  'SEO Services',
  'Brand Identity',
  'Content Strategy',
  'Maintenance & Support',
  'Other',
]

const FIELD_CLASS =
  'mt-1 w-full rounded-lg border bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]'

function clientLabel(client: ClientOption): string {
  const name = client.business_name || client.full_name || 'Unnamed client'
  return client.email ? `${name} — ${client.email}` : name
}

export default function AdminNewProjectPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [clientsError, setClientsError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [selectedClient, setSelectedClient] = useState('')
  const [formData, setFormData] = useState({
    project_name: '',
    title: '',
    description: '',
    service_selected: '',
    start_date: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const fetchClients = useCallback(async (): Promise<ClientOption[]> => {
    setLoading(true)
    setClientsError(null)
    try {
      // /api/admin/clients verifies session, user-bound admin 2FA and active
      // admin membership. `clients` keeps only an own-row SELECT policy after
      // the lockdown, so an admin listing other people's client records must
      // come through the server.
      const response = await fetch('/api/admin/clients?view=options', {
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !Array.isArray(payload?.clients)) {
        setClientsError(payload?.error || 'Failed to load clients. Please refresh and try again.')
        setClients([])
        return []
      }

      const list = payload.clients as ClientOption[]
      setClients(list)
      return list
    } catch (error) {
      console.error('Error:', error)
      setClientsError('Failed to load clients. Please refresh and try again.')
      setClients([])
      return []
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const list = await fetchClients()
      if (cancelled) return

      // ?client= is a UI preselection hint only. It is applied solely when it
      // matches a client this admin's own session already loaded, and the
      // server re-validates the client on submit regardless.
      const requested = new URLSearchParams(window.location.search).get('client')
      if (requested && list.some((c) => c.id === requested)) {
        setSelectedClient(requested)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [fetchClients])

  function validateForm(): boolean {
    const errors: Record<string, string> = {}

    if (!selectedClient) errors.client = 'Please select a client'
    if (!formData.project_name.trim()) errors.project_name = 'Please enter a project name'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (!validateForm()) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          client_id: selectedClient,
          project_name: formData.project_name,
          // The shared projects table requires `title` (portfolio side) while
          // the portal reads `project_name`. Send both.
          title: formData.title.trim() || formData.project_name,
          description: formData.description,
          service_selected: formData.service_selected,
          start_date: formData.start_date || null,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.project?.id) {
        console.error(
          'Error creating project:',
          payload?.error || `Request failed with status ${response.status}`
        )
        setSubmitError(payload?.error || 'Failed to create project. Please try again.')
        return
      }

      router.push(`/admin/projects/${payload.project.id}`)
    } catch (error) {
      console.error('Error:', error)
      setSubmitError('An error occurred while creating the project.')
    } finally {
      setSubmitting(false)
    }
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/projects"
              aria-label="Back to projects"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] rounded-lg"
            >
              <SvgIcon name="chevron-left" size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">New Project</h1>
          </div>
          <p className="text-[var(--text-secondary)]">Create a project for an existing client</p>
        </div>
        <Link href="/admin/projects">
          <Button variant="secondary">Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Client</h2>

          <label
            htmlFor="project-client"
            className="text-sm font-medium text-[var(--text-secondary)]"
          >
            Client *
          </label>
          <select
            id="project-client"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className={`${FIELD_CLASS} ${
              formErrors.client ? 'border-red-500' : 'border-[var(--border)]'
            }`}
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {clientLabel(client)}
              </option>
            ))}
          </select>
          {formErrors.client && <p className="mt-1 text-sm text-red-500">{formErrors.client}</p>}
          {clientsError && <p className="mt-1 text-sm text-red-500">{clientsError}</p>}
          {!clientsError && clients.length === 0 && (
            <p className="mt-1 text-sm text-yellow-500">No clients found</p>
          )}
        </div>

        {/* Project details */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Project Details</h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="project-name"
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                Project Name *
              </label>
              <input
                id="project-name"
                type="text"
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                placeholder="e.g., Shopify Storefront Rebuild"
                className={`${FIELD_CLASS} ${
                  formErrors.project_name ? 'border-red-500' : 'border-[var(--border)]'
                }`}
              />
              {formErrors.project_name && (
                <p className="mt-1 text-sm text-red-500">{formErrors.project_name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="project-title"
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                Title
              </label>
              <input
                id="project-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Defaults to the project name"
                className={`${FIELD_CLASS} border-[var(--border)]`}
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Used by the portfolio side of the shared projects table. Leave blank to reuse the
                project name.
              </p>
            </div>

            <div>
              <label
                htmlFor="project-service"
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                Service
              </label>
              <select
                id="project-service"
                value={formData.service_selected}
                onChange={(e) => setFormData({ ...formData, service_selected: e.target.value })}
                className={`${FIELD_CLASS} border-[var(--border)]`}
              >
                <option value="">Select a service...</option>
                {SERVICES.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="project-start-date"
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                Start Date
              </label>
              <input
                id="project-start-date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className={`${FIELD_CLASS} border-[var(--border)]`}
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">Defaults to today.</p>
            </div>

            <div>
              <label
                htmlFor="project-description"
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                Description
              </label>
              <textarea
                id="project-description"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this project delivering?"
                className={`${FIELD_CLASS} border-[var(--border)]`}
              />
            </div>
          </div>
        </div>

        {submitError && (
          <p role="alert" className="text-sm text-red-500">
            {submitError}
          </p>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/admin/projects">
            <Button variant="secondary" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </div>
  )
}
