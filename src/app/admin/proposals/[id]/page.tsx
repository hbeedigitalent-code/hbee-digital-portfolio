// src/app/admin/proposals/[id]/page.tsx

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase-client'
import { proposalStatusLabel, proposalStatusTransitions } from '@/lib/proposal-status'
import {
  MAX_PROPOSAL_FILE_LABEL,
  PROPOSAL_FILE_ACCEPT_ATTRIBUTE,
  formatFileSize,
} from '@/lib/proposal-file-validation'
import StatusBadge from '@/components/ui/StatusBadge'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

interface PageProps {
  params: {
    id: string
  }
}

interface ProposalFile {
  id: string
  proposal_id: string
  file_name: string
  file_type: string
  file_size: number
  uploaded_at: string
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]'

function fileExtensionLabel(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === fileName.length - 1) return 'FILE'
  return fileName.slice(lastDot + 1).toUpperCase()
}

export default function AdminProposalDetailPage({ params }: PageProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [proposal, setProposal] = useState<any>(null)
  const [merchant, setMerchant] = useState<any>(null)
  const [updating, setUpdating] = useState(false)

  // Attachments. All reads/writes go through the authenticated admin API —
  // never a direct browser query against proposal_files or Storage.
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<ProposalFile[]>([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [busyFileId, setBusyFileId] = useState<string | null>(null)

  useEffect(() => {
    fetchProposal()
  }, [params.id])

  const fetchFiles = useCallback(async () => {
    setFilesLoading(true)
    try {
      const response = await fetch(`/api/admin/proposals/${params.id}/files`, {
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !Array.isArray(payload?.files)) {
        console.error('Error fetching attachments:', payload?.error || response.status)
        setFileError('Could not load attachments.')
        setFiles([])
        return
      }

      setFiles(payload.files as ProposalFile[])
    } catch (error) {
      console.error('Error:', error)
      setFileError('Could not load attachments.')
      setFiles([])
    } finally {
      setFilesLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileError(null)
    setUploadingFile(true)

    try {
      const body = new FormData()
      body.append('file', file)

      // Only the file is sent. proposal_id comes from the URL, and client_id,
      // uploaded_by and object_path are all derived server-side.
      const response = await fetch(`/api/admin/proposals/${params.id}/files`, {
        method: 'POST',
        credentials: 'same-origin',
        body,
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.file) {
        setFileError(payload?.error || 'Failed to upload file. Please try again.')
        return
      }

      await fetchFiles()
    } catch (error) {
      console.error('Error:', error)
      setFileError('Failed to upload file. Please try again.')
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDownload(file: ProposalFile) {
    setFileError(null)
    setBusyFileId(file.id)
    try {
      const response = await fetch(
        `/api/admin/proposals/${params.id}/files/${file.id}/signed-url`,
        { credentials: 'same-origin' },
      )
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.url) {
        setFileError('Could not generate a download link.')
        return
      }

      window.open(payload.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Error:', error)
      setFileError('Could not generate a download link.')
    } finally {
      setBusyFileId(null)
    }
  }

  async function handleDeleteFile(file: ProposalFile) {
    if (!confirm(`Delete "${file.file_name}"? This cannot be undone.`)) return

    setFileError(null)
    setBusyFileId(file.id)
    try {
      const response = await fetch(
        `/api/admin/proposals/${params.id}/files/${file.id}`,
        { method: 'DELETE', credentials: 'same-origin' },
      )
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setFileError(payload?.error || 'Failed to delete file.')
        return
      }

      await fetchFiles()
    } catch (error) {
      console.error('Error:', error)
      setFileError('Failed to delete file.')
    } finally {
      setBusyFileId(null)
    }
  }

  async function fetchProposal() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          merchant:merchants(*),
          client:clients(*)
        `)
        .eq('id', params.id)
        .single()

      if (error) {
        console.error('Error fetching proposal:', error)
        return
      }

      setProposal(data)
      setMerchant(data.merchant)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * The SEND transition goes through the authenticated admin API, never a
   * direct browser write.
   *
   * /api/admin/proposals/{id}/status re-verifies session + 2FA + active admin,
   * reads client_id from the STORED row, and refuses to send a proposal whose
   * client_id is NULL — a state in which no client account could ever open the
   * proposal, because every client route requires
   * proposals.client_id = <caller's clients.id>. It also emits the single
   * client-scope `proposal_sent` notification server-side.
   *
   * Only the target status is sent. No client_id, merchant_id, sent_at or any
   * other ownership/commercial field leaves the browser.
   */
  async function sendProposal() {
    setUpdating(true)
    try {
      const response = await fetch(`/api/admin/proposals/${params.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status: 'sent' }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        alert(payload?.error || 'Failed to send this proposal.')
        return
      }

      await fetchProposal()
      alert('Proposal sent to the client portal.')
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to send this proposal.')
    } finally {
      setUpdating(false)
    }
  }

  /**
   * The APPROVE transition, also server-routed.
   *
   * This used to be two browser writes: a direct proposals update, and
   * MerchantLifecycleService.updateStatus() against merchant_status — a table
   * the access lockdown closes to the browser. Both now happen inside
   * /api/admin/proposals/{id}/status, which re-verifies session + 2FA +
   * active admin and derives the merchant from the STORED proposal row.
   *
   * The two writes are separate statements and are NOT atomic. The response
   * reports the lifecycle result separately, and a lifecycle failure is shown
   * to the admin rather than folded into a success message.
   */
  async function approveProposal() {
    setUpdating(true)
    try {
      const response = await fetch(`/api/admin/proposals/${params.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status: 'approved' }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        alert(payload?.error || 'Failed to approve this proposal.')
        return
      }

      await fetchProposal()

      if (payload?.lifecycle === 'updated') {
        alert('Proposal approved.')
      } else if (payload?.lifecycle === 'not_linked') {
        alert(
          'Proposal approved. It is not linked to a merchant, so no merchant stage was updated.',
        )
      } else if (payload?.lifecycle === 'no_status_row') {
        alert(
          'Proposal approved, but this merchant has no lifecycle record, so their stage was not updated.',
        )
      } else {
        alert(
          'Proposal approved, but the merchant stage could not be updated. Please update it manually.',
        )
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to approve this proposal.')
    } finally {
      setUpdating(false)
    }
  }

  async function updateStatus(status: string) {
    if (!confirm(`Change proposal status to "${status}"?`)) return

    // Send and approve are both server-routed. Every other transition is a
    // plain proposals update and is unchanged.
    if (status === 'sent') {
      await sendProposal()
      return
    }
    if (status === 'approved') {
      await approveProposal()
      return
    }

    setUpdating(true)
    try {
      const updates: any = { status }

      const { error } = await supabase
        .from('proposals')
        .update(updates)
        .eq('id', params.id)

      if (error) {
        console.error('Error updating proposal:', error)
        alert('Failed to update proposal status.')
        return
      }

      await fetchProposal()
      alert(`Proposal status updated to "${status}"`)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <SvgIcon name="warning" size={48} color="var(--text-muted)" />
        <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">Proposal Not Found</h2>
        <p className="mt-2 text-[var(--text-secondary)]">The proposal you're looking for doesn't exist.</p>
        <Link href="/admin/proposals">
          <Button className="mt-6">Back to Proposals</Button>
        </Link>
      </div>
    )
  }

  const totalServices = proposal.services?.reduce((sum: number, s: any) => sum + (parseFloat(s.price) || 0), 0) || 0

  // Transitions come from the shared vocabulary in src/lib/proposal-status.ts
  // so the list and detail pages can no longer drift apart.
  const availableActions = proposalStatusTransitions(proposal.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/proposals" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <SvgIcon name="chevron-left" size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {proposal.title}
            </h1>
            <StatusBadge status={proposal.status} />
          </div>
          <p className="text-[var(--text-secondary)]">
            #{proposal.proposal_number} • {merchant?.business_name || 'Unknown Merchant'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/proposals/${proposal.id}/edit`}>
            <Button variant="secondary" size="sm">
              <SvgIcon name="edit" size={14} />
              Edit
            </Button>
          </Link>
          {availableActions.map((action) => (
            <Button
              key={action}
              size="sm"
              onClick={() => updateStatus(action)}
              disabled={updating}
            >
              {proposalStatusLabel(action)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Services */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Services</h3>
            <div className="space-y-3">
              {proposal.services?.map((service: any, index: number) => (
                <div key={index} className="flex items-start justify-between border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{service.name}</p>
                    {service.description && (
                      <p className="text-sm text-[var(--text-muted)]">{service.description}</p>
                    )}
                  </div>
                  <p className="font-semibold text-[var(--text-primary)]">
                    ${parseFloat(service.price).toFixed(2)}
                  </p>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <span className="font-semibold text-[var(--text-primary)]">Total</span>
                <span className="text-lg font-bold text-[var(--text-primary)]">
                  ${totalServices.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline & Terms */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Timeline</h3>
              <p className="text-[var(--text-secondary)]">{proposal.timeline || 'Not specified'}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Payment Terms</h3>
              <p className="text-[var(--text-secondary)]">{proposal.pricing?.payment_terms || 'Not specified'}</p>
            </div>
          </div>

          {/* Notes */}
          {proposal.notes && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Internal Notes</h3>
              <p className="text-[var(--text-secondary)]">{proposal.notes}</p>
            </div>
          )}

          {/* Terms & Conditions */}
          {proposal.terms && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Terms & Conditions</h3>
              <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{proposal.terms}</p>
            </div>
          )}

          {/* Attachments — private proposal-files bucket, download-only.
              Uploads and downloads go through the authenticated admin API;
              storage paths are never exposed to the browser. */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Attachments</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, CSV · max {MAX_PROPOSAL_FILE_LABEL}
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="proposal-file-upload"
                  accept={PROPOSAL_FILE_ACCEPT_ATTRIBUTE}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className={`inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`}
                >
                  <SvgIcon name="upload" size={14} color="white" />
                  {uploadingFile ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </div>

            {fileError && (
              <p role="alert" className="mb-3 text-sm text-red-500">
                {fileError}
              </p>
            )}

            {filesLoading ? (
              <p className="text-sm text-[var(--text-muted)]">Loading attachments…</p>
            ) : files.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No attachments yet. Upload the proposal document and any supporting files.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <SvgIcon name="document" size={18} color="var(--text-muted)" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--text-primary)]" title={file.file_name}>
                          {file.file_name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {fileExtensionLabel(file.file_name)} · {formatFileSize(file.file_size)} ·{' '}
                          {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(file)}
                        disabled={busyFileId === file.id}
                        className={`inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline disabled:cursor-wait disabled:opacity-60 ${FOCUS_RING}`}
                      >
                        <SvgIcon name="download" size={14} color="var(--accent)" />
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(file)}
                        disabled={busyFileId === file.id}
                        aria-label={`Delete ${file.file_name}`}
                        className={`inline-flex items-center gap-1 text-sm text-red-500 hover:underline disabled:cursor-wait disabled:opacity-60 ${FOCUS_RING}`}
                      >
                        <SvgIcon name="trash" size={14} color="#ef4444" />
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Merchant Info */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Merchant Information</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-[var(--text-muted)]">Business</dt>
                <dd className="font-medium text-[var(--text-primary)]">{merchant?.business_name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Contact</dt>
                <dd className="font-medium text-[var(--text-primary)]">{merchant?.contact_name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Email</dt>
                <dd className="font-medium text-[var(--text-primary)]">{merchant?.email || 'N/A'}</dd>
              </div>
              {merchant?.website && (
                <div>
                  <dt className="text-[var(--text-muted)]">Website</dt>
                  <dd>
                    <a href={merchant.website} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                      {merchant.website}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Proposal Details */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Proposal Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-[var(--text-muted)]">Number</dt>
                <dd className="font-medium text-[var(--text-primary)]">{proposal.proposal_number}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[var(--text-muted)]">Status</dt>
                <dd><StatusBadge status={proposal.status} size="sm" /></dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[var(--text-muted)]">Created</dt>
                <dd className="text-[var(--text-secondary)]">{new Date(proposal.created_at).toLocaleDateString()}</dd>
              </div>
              {proposal.sent_at && (
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--text-muted)]">Sent</dt>
                  <dd className="text-[var(--text-secondary)]">{new Date(proposal.sent_at).toLocaleDateString()}</dd>
                </div>
              )}
              {proposal.accepted_at && (
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--text-muted)]">Approved</dt>
                  <dd className="text-[var(--text-secondary)]">{new Date(proposal.accepted_at).toLocaleDateString()}</dd>
                </div>
              )}
              {proposal.expires_at && (
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--text-muted)]">Expires</dt>
                  <dd className="text-[var(--text-secondary)]">{new Date(proposal.expires_at).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Actions */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Actions</h3>
            <div className="space-y-2">
              {proposal.status === 'approved' && (
                <Link href={`/admin/client-onboarding/new?proposal=${proposal.id}`}>
                  <Button className="w-full">
                    <SvgIcon name="users" size={16} color="white" />
                    Start Onboarding
                  </Button>
                </Link>
              )}
              {proposal.pdf_url && (
                <a
                  href={proposal.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="secondary" className="w-full">
                    <SvgIcon name="download" size={16} />
                    Download PDF
                  </Button>
                </a>
              )}
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/client-portal/proposals/${proposal.id}`
                  navigator.clipboard.writeText(shareUrl)
                  alert('Share link copied to clipboard!')
                }}
                className="w-full"
              >
                <Button variant="secondary" className="w-full">
                  <SvgIcon name="link" size={16} />
                  Copy Share Link
                </Button>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}