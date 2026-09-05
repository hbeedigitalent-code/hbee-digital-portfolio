// src/app/admin/client-portal/[client_id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Client {
  id: string
  full_name: string
  email: string
  whatsapp: string
  business_name: string
  website_url: string
  country: string
  status: string
  created_at: string
}

interface Project {
  id: string
  project_id: string
  project_name: string
  status: string
  progress: number
  service_selected: string
  expected_completion_date: string
}

interface ClientFile {
  id: string
  project_id: string | null
  project_name: string | null
  file_name: string
  file_type: string
  file_size: number
  category: string | null
  uploaded_by: string | null
  uploaded_at: string
}

export default function AdminClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // Client-level files (Phase 1) — project_files has no session-client read
  // path for admins, so this goes through the service-role-backed admin API.
  const [files, setFiles] = useState<ClientFile[]>([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    fetchClientData()
  }, [params.client_id])

  useEffect(() => {
    fetchClientFiles()
  }, [params.client_id])

  async function fetchClientData() {
    setLoading(true)

    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', params.client_id)
      .single()

    if (clientError || !clientData) {
      router.push('/admin/client-portal')
      return
    }

    setClient(clientData)

    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', clientData.id)
      .order('created_at', { ascending: false })

    setProjects(projectData || [])
    setLoading(false)
  }

  async function fetchClientFiles() {
    setFilesLoading(true)
    setFilesError(null)

    try {
      const response = await fetch(`/api/admin/clients/${params.client_id}/files`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load files')
      }

      setFiles(result.files || [])
    } catch (error) {
      console.error('Failed to load client files:', error)
      setFilesError('Failed to load files. Please try again.')
    } finally {
      setFilesLoading(false)
    }
  }

  async function handleFileDownload(file: ClientFile) {
    setFilesError(null)
    setDownloadingId(file.id)

    // Open the tab synchronously, before any await, so it is not treated as
    // an unrequested popup.
    const newTab = window.open('', '_blank')

    try {
      const response = await fetch(
        `/api/admin/clients/${params.client_id}/files/${file.id}/signed-url`,
      )
      const result = await response.json()

      if (!response.ok || !result.url) {
        throw new Error(result.error || 'Failed to generate download link')
      }

      if (newTab) {
        newTab.location.href = result.url
      } else {
        window.location.href = result.url
      }
    } catch (error) {
      console.error('Admin file download error:', error)
      if (newTab) newTab.close()
      setFilesError('Failed to prepare download. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Client not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/client-portal"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            <SvgIcon name="chevron-left" size={16} color="var(--text-muted)" />
            Back to Clients
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-2">
            {client.full_name}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">{client.business_name}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client Info */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Client Information</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Full Name</p>
              <p className="text-sm text-[var(--text-primary)]">{client.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Email</p>
              <p className="text-sm text-[var(--text-primary)]">{client.email}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">WhatsApp</p>
              <p className="text-sm text-[var(--text-primary)]">{client.whatsapp || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Business</p>
              <p className="text-sm text-[var(--text-primary)]">{client.business_name}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Website</p>
              <p className="text-sm text-[var(--text-primary)]">{client.website_url || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Country</p>
              <p className="text-sm text-[var(--text-primary)]">{client.country || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Status</p>
              <p className="text-sm font-medium text-[var(--accent-lime)]">{client.status}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Joined</p>
              <p className="text-sm text-[var(--text-primary)]">{new Date(client.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Projects ({projects.length})</h3>
            <Link
              href={`/admin/projects/new?client=${client.id}`}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              + Add Project
            </Link>
          </div>
          {projects.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No projects yet</p>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/admin/projects/${project.id}`}
                  className="block rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 transition hover:border-[var(--accent)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{project.project_name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{project.project_id}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[var(--text-muted)]">{project.progress}%</span>
                      <p className="text-xs text-[var(--text-muted)]">{project.status}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client Files (Phase 1) — every file this client has uploaded, across
          all their projects plus General (project_id = NULL) uploads. */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Files {!filesLoading && `(${files.length})`}
        </h3>

        {filesError && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-500">
            {filesError}
          </div>
        )}

        {filesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No files uploaded by this client yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                  <th className="pb-3 font-medium">File Name</th>
                  <th className="pb-3 font-medium hidden sm:table-cell">Project</th>
                  <th className="pb-3 font-medium hidden md:table-cell">Type</th>
                  <th className="pb-3 font-medium hidden md:table-cell">Size</th>
                  <th className="pb-3 font-medium hidden lg:table-cell">Uploaded By</th>
                  <th className="pb-3 font-medium hidden lg:table-cell">Uploaded</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-section)]">
                    <td className="py-3 font-medium text-[var(--text-primary)]">
                      <div className="flex items-center gap-2">
                        <SvgIcon name="file" size={16} color="var(--text-muted)" />
                        <div className="min-w-0">
                          <span className="block">{file.file_name}</span>
                          <span className="block text-xs text-[var(--text-muted)] sm:hidden">
                            {file.project_id ? file.project_name || 'Project' : 'General'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-[var(--text-muted)] hidden sm:table-cell">
                      {file.project_id ? file.project_name || 'Project' : 'General'}
                    </td>
                    <td className="py-3 text-[var(--text-muted)] hidden md:table-cell">
                      {file.file_type?.split('/').pop() || 'Unknown'}
                    </td>
                    <td className="py-3 text-[var(--text-muted)] hidden md:table-cell">
                      {formatFileSize(file.file_size)}
                    </td>
                    <td className="py-3 text-[var(--text-muted)] hidden lg:table-cell">
                      {file.uploaded_by || 'N/A'}
                    </td>
                    <td className="py-3 text-[var(--text-muted)] hidden lg:table-cell">
                      {new Date(file.uploaded_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleFileDownload(file)}
                        disabled={downloadingId === file.id}
                        className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline disabled:cursor-wait disabled:opacity-60"
                      >
                        {downloadingId === file.id ? 'Preparing...' : 'Download'}
                        <SvgIcon name="download" size={12} color="var(--accent)" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}