// src/app/admin/projects/[project_id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Project {
  id: string
  project_id: string
  project_name: string
  client_id: string
  status: string
  progress: number
  service_selected: string
  start_date: string
  expected_completion_date: string
  description: string
  created_at: string
  client?: { full_name: string; business_name: string; email: string }
}

interface ProjectFile {
  id: string
  project_id: string
  client_id: string
  file_name: string
  file_type: string
  file_size: number
  category: string | null
  uploaded_by: string | null
  uploaded_at: string
}

const statusOptions = [
  'Onboarding',
  'Assets Required',
  'In Review',
  'In Progress',
  'Awaiting Client Feedback',
  'Revision Stage',
  'Completed',
  'Archived'
]

const statusColors: Record<string, string> = {
  'Onboarding': 'bg-[var(--warning-subtle)] text-[var(--warning)]',
  'Assets Required': 'bg-[var(--warning-subtle)] text-[var(--warning)]',
  'In Review': 'bg-[var(--accent-subtle)] text-[var(--accent)]',
  'In Progress': 'bg-[var(--accent-subtle)] text-[var(--accent)]',
  'Awaiting Client Feedback': 'bg-[var(--accent-subtle)] text-[var(--accent)]',
  'Revision Stage': 'bg-[var(--warning-subtle)] text-[var(--warning)]',
  'Completed': 'bg-[var(--success-subtle)] text-[var(--success)]',
  'Archived': 'bg-[var(--bg-section)] text-[var(--text-secondary)]',
}

export default function AdminProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [progressValue, setProgressValue] = useState(0)

  // Project Files (Batch 1C Stage 2) — project_files has RLS enabled with no
  // policies at all, so unlike `project` above this can't be fetched with a
  // direct supabase.from() call; it goes through the service-role-backed
  // admin API routes instead.
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    fetchProjectData()
  }, [params.project_id])

  useEffect(() => {
    fetchProjectFiles()
  }, [params.project_id])

  async function fetchProjectData() {
    setLoading(true)

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        clients (full_name, business_name, email)
      `)
      .eq('id', params.project_id)
      .single()

    if (error || !data) {
      router.push('/admin/projects')
      return
    }

    setProject(data)
    setSelectedStatus(data.status)
    setProgressValue(data.progress || 0)
    setLoading(false)
  }

  async function updateProject() {
    if (!project) return

    setUpdating(true)

    const { error } = await supabase
      .from('projects')
      .update({
        status: selectedStatus,
        progress: progressValue,
      })
      .eq('id', project.id)

    if (!error) {
      setProject({ ...project, status: selectedStatus, progress: progressValue })
    }

    setUpdating(false)
  }

  async function fetchProjectFiles() {
    setFilesLoading(true)
    setFilesError(null)

    try {
      const response = await fetch(`/api/admin/projects/${params.project_id}/files`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load files')
      }

      setFiles(result.files || [])
    } catch (error) {
      console.error('Failed to load project files:', error)
      setFilesError('Failed to load files. Please try again.')
    } finally {
      setFilesLoading(false)
    }
  }

  async function handleFileDownload(file: ProjectFile) {
    setFilesError(null)
    setDownloadingId(file.id)

    // Open the tab synchronously, inside the click handler, before any
    // await — a tab opened only after an awaited fetch resolves is treated
    // as an unrequested popup by most browsers and gets blocked.
    const newTab = window.open('', '_blank')

    try {
      const response = await fetch(
        `/api/admin/projects/${params.project_id}/files/${file.id}/signed-url`,
      )
      const result = await response.json()

      if (!response.ok || !result.url) {
        throw new Error(result.error || 'Failed to generate download link')
      }

      if (newTab) {
        newTab.location.href = result.url
      } else {
        // Popup was blocked despite the synchronous open — fall back to a
        // same-tab navigation.
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

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Project not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/projects"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            <SvgIcon name="chevron-left" size={16} color="var(--text-muted)" />
            Back to Projects
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-2">
            {project.project_name}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">{project.project_id}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[project.status]}`}>
          {project.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Management */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Project Management</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Progress: {progressValue}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressValue}
                  onChange={(e) => setProgressValue(parseInt(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
              </div>

              <button
                onClick={updateProject}
                disabled={updating}
                className="w-full rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
              >
                {updating ? 'Updating...' : 'Update Project'}
              </button>
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Project Details</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Client</p>
                <p className="text-sm text-[var(--text-primary)]">{project.client?.full_name || 'N/A'}</p>
                <p className="text-xs text-[var(--text-muted)]">{project.client?.email || ''}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Business</p>
                <p className="text-sm text-[var(--text-primary)]">{project.client?.business_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Service</p>
                <p className="text-sm text-[var(--text-primary)]">{project.service_selected || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Start Date</p>
                <p className="text-sm text-[var(--text-primary)]">{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Expected Completion</p>
                <p className="text-sm text-[var(--text-primary)]">{project.expected_completion_date ? new Date(project.expected_completion_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Created</p>
                <p className="text-sm text-[var(--text-primary)]">{new Date(project.created_at).toLocaleDateString()}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)]">Description</p>
                <p className="text-sm text-[var(--text-primary)]">{project.description || 'No description'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Files (Batch 1C Stage 2) — read-only review + signed downloads.
          No upload, delete, archive, or message functionality here yet. */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Project Files {!filesLoading && `(${files.length})`}
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
          <p className="text-sm text-[var(--text-muted)]">No files uploaded to this project yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                  <th className="pb-3 font-medium">File Name</th>
                  <th className="pb-3 font-medium hidden sm:table-cell">Type</th>
                  <th className="pb-3 font-medium hidden md:table-cell">Size</th>
                  <th className="pb-3 font-medium hidden lg:table-cell">Category</th>
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
                        {file.file_name}
                      </div>
                    </td>
                    <td className="py-3 text-[var(--text-muted)] hidden sm:table-cell">
                      {file.file_type?.split('/').pop() || 'Unknown'}
                    </td>
                    <td className="py-3 text-[var(--text-muted)] hidden md:table-cell">
                      {formatFileSize(file.file_size)}
                    </td>
                    <td className="py-3 text-[var(--text-muted)] hidden lg:table-cell">
                      {file.category || 'N/A'}
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
