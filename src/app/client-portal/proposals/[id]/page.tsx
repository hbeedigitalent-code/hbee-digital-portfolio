// src/app/client-portal/proposals/[id]/page.tsx
//
// Client proposal review. Phase P3.
//
// This page never touches Supabase: every read and every decision goes through
// the authenticated /api/client-portal/proposals/* routes, which resolve the
// caller's clients.id server-side and enforce the ownership + status predicate.
// Attachments are metadata only; downloads use the existing 60-second
// signed-URL route, so no storage path ever reaches the browser.
//
// It also never imports createNotification.ts — the admin notification is
// emitted by the approve / request-changes routes on the server.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import StatusPill from '@/components/ui/StatusPill'
import { proposalStatusLabel } from '@/lib/proposal-status'
import { formatFileSize } from '@/lib/proposal-file-validation'

interface ProposalFile {
  id: string
  file_name: string
  file_type: string
  file_size: number
  uploaded_at: string
}

interface ProposalService {
  name?: string
  description?: string
  price?: string | number
}

interface ProposalPricing {
  total?: number | string | null
  currency?: string | null
  payment_terms?: string | null
}

interface ClientProposal {
  id: string
  proposal_number: string | null
  title: string | null
  status: string
  services: ProposalService[] | null
  pricing: ProposalPricing | null
  timeline: string | null
  terms: string | null
  expires_at: string | null
  sent_at: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string | null
  merchant?: {
    business_name: string | null
    contact_name: string | null
    email: string | null
    website: string | null
  } | null
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]'

const MAX_REASON_LENGTH = 2000

function formatMoney(pricing: ProposalPricing | null): string {
  const total = Number(pricing?.total)
  if (!Number.isFinite(total)) return '—'
  const currency = pricing?.currency || 'USD'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(total)
  } catch {
    return `${currency} ${total.toLocaleString()}`
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function fileExtensionLabel(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === fileName.length - 1) return 'FILE'
  return fileName.slice(lastDot + 1).toUpperCase()
}

export default function ClientProposalDetailPage({ params }: { params: { id: string } }) {
  const [proposal, setProposal] = useState<ClientProposal | null>(null)
  const [files, setFiles] = useState<ProposalFile[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [busyFileId, setBusyFileId] = useState<string | null>(null)

  const [changesOpen, setChangesOpen] = useState(false)
  const [reason, setReason] = useState('')

  const fetchProposal = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/client-portal/proposals/${params.id}`, {
        credentials: 'same-origin',
      })

      if (response.status === 404) {
        setNotFound(true)
        return
      }

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.proposal) {
        setError('Could not load this proposal. Please refresh and try again.')
        return
      }

      setProposal(payload.proposal as ClientProposal)
      setFiles(Array.isArray(payload.files) ? (payload.files as ProposalFile[]) : [])
    } catch (err) {
      console.error('Error:', err)
      setError('Could not load this proposal. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchProposal()
  }, [fetchProposal])

  // Mark as viewed once, after the proposal loads in `sent`. The route only
  // permits sent -> viewed, so this is a no-op in every other state.
  useEffect(() => {
    if (proposal?.status !== 'sent') return
    let cancelled = false

    async function markViewed() {
      try {
        const response = await fetch(`/api/client-portal/proposals/${params.id}/viewed`, {
          method: 'POST',
          credentials: 'same-origin',
        })
        if (!response.ok || cancelled) return
        setProposal((current) => (current ? { ...current, status: 'viewed' } : current))
      } catch {
        /* non-critical — the proposal is still readable */
      }
    }

    markViewed()
    return () => {
      cancelled = true
    }
  }, [proposal?.status, params.id])

  async function handleDownload(file: ProposalFile) {
    setError(null)
    setBusyFileId(file.id)
    try {
      const response = await fetch(
        `/api/client-portal/proposals/${params.id}/files/${file.id}/signed-url`,
        { credentials: 'same-origin' },
      )
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.url) {
        setError('Could not generate a download link.')
        return
      }

      window.open(payload.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Error:', err)
      setError('Could not generate a download link.')
    } finally {
      setBusyFileId(null)
    }
  }

  async function handleApprove() {
    if (!confirm('Approve this proposal? Your account manager will be notified.')) return

    setError(null)
    setSubmitting(true)
    try {
      const response = await fetch(`/api/client-portal/proposals/${params.id}/approve`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.proposal) {
        setError(payload?.error || 'Could not approve this proposal. Please try again.')
        return
      }

      setProposal((current) =>
        current
          ? { ...current, status: 'approved', accepted_at: payload.proposal.accepted_at }
          : current,
      )
      setSuccessMessage('Proposal approved. Your account manager has been notified.')
    } catch (err) {
      console.error('Error:', err)
      setError('Could not approve this proposal. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRequestChanges(e: React.FormEvent) {
    e.preventDefault()

    const trimmed = reason.trim()
    if (!trimmed) {
      setError('Please describe the changes you would like.')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      const response = await fetch(
        `/api/client-portal/proposals/${params.id}/request-changes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ reason: trimmed }),
        },
      )
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.proposal) {
        setError(payload?.error || 'Could not submit your request. Please try again.')
        return
      }

      setProposal((current) => (current ? { ...current, status: 'changes_requested' } : current))
      setChangesOpen(false)
      setReason('')
      setSuccessMessage('Your change request has been sent. We will be in touch shortly.')
    } catch (err) {
      console.error('Error:', err)
      setError('Could not submit your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  if (notFound || !proposal) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <SvgIcon name="warning" size={48} color="var(--text-muted)" />
        <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">Proposal Not Found</h2>
        <p className="text-[var(--text-muted)]">
          This proposal doesn&apos;t exist or is no longer available to you.
        </p>
        <Link
          href="/client-portal"
          className={`mt-4 rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] ${FOCUS_RING}`}
        >
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const services = Array.isArray(proposal.services) ? proposal.services : []
  const canDecide = proposal.status === 'sent' || proposal.status === 'viewed'
  const isApproved = proposal.status === 'approved'
  const isChangesRequested = proposal.status === 'changes_requested'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {proposal.title || 'Proposal'}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {proposal.proposal_number || '—'}
              {proposal.merchant?.business_name ? ` · ${proposal.merchant.business_name}` : ''}
            </p>
          </div>
          <StatusPill status={proposalStatusLabel(proposal.status)} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Investment</p>
            <p className="font-medium text-[var(--text-primary)]">{formatMoney(proposal.pricing)}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Timeline</p>
            <p className="font-medium text-[var(--text-primary)]">{proposal.timeline || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Payment Terms</p>
            <p className="font-medium text-[var(--text-primary)]">
              {proposal.pricing?.payment_terms || '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Expires</p>
            <p className="font-medium text-[var(--text-primary)]">
              {formatDate(proposal.expires_at)}
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <p
          role="status"
          className="rounded-xl border border-[var(--success)]/30 bg-[var(--success-subtle)] p-4 text-sm text-[var(--success)]"
        >
          {successMessage}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      {/* Scope / services */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Scope of Work</h2>
        {services.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">No services listed.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {services.map((service, index) => (
              <div
                key={index}
                className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text-primary)]">{service.name || '—'}</p>
                  {service.description && (
                    <p className="text-sm text-[var(--text-muted)]">{service.description}</p>
                  )}
                </div>
                <p className="font-semibold text-[var(--text-primary)]">
                  {Number.isFinite(Number(service.price))
                    ? `$${Number(service.price).toFixed(2)}`
                    : '—'}
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
              <span className="font-semibold text-[var(--text-primary)]">Total</span>
              <span className="text-lg font-bold text-[var(--text-primary)]">
                {formatMoney(proposal.pricing)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Attachments */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Documents</h2>
        {files.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            No documents attached to this proposal.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <SvgIcon name="document" size={18} color="var(--text-muted)" />
                  <div className="min-w-0">
                    <p
                      className="truncate font-medium text-[var(--text-primary)]"
                      title={file.file_name}
                    >
                      {file.file_name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {fileExtensionLabel(file.file_name)} · {formatFileSize(file.file_size)} ·{' '}
                      {formatDate(file.uploaded_at)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(file)}
                  disabled={busyFileId === file.id}
                  className={`inline-flex flex-shrink-0 items-center gap-1 text-sm text-[var(--accent-orange)] hover:underline disabled:cursor-wait disabled:opacity-60 ${FOCUS_RING}`}
                >
                  <SvgIcon name="download" size={14} color="var(--accent-orange)" />
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Terms */}
      {proposal.terms && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Terms &amp; Conditions</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
            {proposal.terms}
          </p>
        </div>
      )}

      {/* Decision */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your Decision</h2>

        {isApproved && (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            You approved this proposal on {formatDate(proposal.accepted_at)}. We&apos;ll be in touch
            with next steps.
          </p>
        )}

        {isChangesRequested && (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            You&apos;ve requested changes to this proposal. We&apos;re reviewing your feedback and
            will send an updated version shortly.
          </p>
        )}

        {canDecide && !changesOpen && (
          <>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Review the scope and documents above, then approve or tell us what you&apos;d like
              changed.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleApprove}
                disabled={submitting}
                className={`inline-flex items-center gap-2 rounded-full bg-[var(--accent-orange)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] disabled:opacity-50 ${FOCUS_RING}`}
              >
                <SvgIcon name="check" size={16} color="white" />
                {submitting ? 'Submitting…' : 'Approve Proposal'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChangesOpen(true)
                  setError(null)
                }}
                disabled={submitting}
                className={`inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-section)] disabled:opacity-50 ${FOCUS_RING}`}
              >
                Request Changes
              </button>
            </div>
          </>
        )}

        {canDecide && changesOpen && (
          <form onSubmit={handleRequestChanges} className="mt-4 space-y-3">
            <div>
              <label
                htmlFor="proposal-change-reason"
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                What would you like changed? *
              </label>
              <textarea
                id="proposal-change-reason"
                rows={5}
                maxLength={MAX_REASON_LENGTH}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tell us what to adjust — scope, pricing, timeline, anything else."
                className={`mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-orange)] focus:outline-none ${FOCUS_RING}`}
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {reason.length}/{MAX_REASON_LENGTH}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting || !reason.trim()}
                className={`inline-flex items-center gap-2 rounded-full bg-[var(--accent-orange)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] disabled:opacity-50 ${FOCUS_RING}`}
              >
                {submitting ? 'Sending…' : 'Send Request'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChangesOpen(false)
                  setReason('')
                }}
                disabled={submitting}
                className={`inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-section)] disabled:opacity-50 ${FOCUS_RING}`}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
