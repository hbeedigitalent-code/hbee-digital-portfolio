// src/app/admin/proposals/[id]/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase-client'
import { MerchantLifecycleService } from '@/lib/services/merchant-lifecycle'
import { proposalStatusLabel, proposalStatusTransitions } from '@/lib/proposal-status'
import StatusBadge from '@/components/ui/StatusBadge'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

interface PageProps {
  params: {
    id: string
  }
}

export default function AdminProposalDetailPage({ params }: PageProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [proposal, setProposal] = useState<any>(null)
  const [merchant, setMerchant] = useState<any>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchProposal()
  }, [params.id])

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

  async function updateStatus(status: string) {
    if (!confirm(`Change proposal status to "${status}"?`)) return

    setUpdating(true)
    try {
      const updates: any = { status }

      if (status === 'sent') {
        updates.sent_at = new Date().toISOString()
      }
      // 'approved' is the stored value; accepted_at is the existing timestamp
      // column and is reused as-is — this batch adds no columns.
      if (status === 'approved') {
        updates.accepted_at = new Date().toISOString()
        // Update merchant status
        await MerchantLifecycleService.updateStatus(proposal.merchant_id, 'proposal_accepted')
      }

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