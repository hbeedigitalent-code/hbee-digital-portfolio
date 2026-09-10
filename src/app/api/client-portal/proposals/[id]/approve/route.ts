// src/app/api/client-portal/proposals/[id]/approve/route.ts
//
// POST — the client approves their own proposal.
//
// Allowed from: sent, viewed, changes_requested. The `.in('status', ...)` in
// the UPDATE is the guard, not just a filter — a proposal in draft, rejected,
// expired or already-approved matches zero rows and 404s. That also makes a
// double-click idempotent: the second request finds nothing to update.
//
// NOTHING commercial is read from the request. The body is ignored entirely;
// only `status`, `accepted_at` and `updated_at` are written. client_id,
// merchant_id, pricing, services, terms and title are never touched, and a
// client-supplied status/client_id/merchant_id has no path into the query.
//
// `accepted_at` already exists and is already written by the admin status
// action, so it is reused here rather than inventing a column.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createNotification } from '@/lib/notifications/createNotification'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A proposal can be approved from any delivered, undecided state. */
const APPROVABLE_STATUSES = ['sent', 'viewed', 'changes_requested']

let serviceRoleClient: any = null

function getServiceRoleClient() {
  if (serviceRoleClient) return serviceRoleClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) return null

  const { createClient } = require('@supabase/supabase-js')
  serviceRoleClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return serviceRoleClient
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = getServiceRoleClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const proposalId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(proposalId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: clientRow } = await adminClient
      .from('clients')
      .select('id, business_name, full_name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!clientRow?.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const now = new Date().toISOString()

    // Only `status` and `accepted_at` are written.
    //
    // `updated_at` is deliberately NOT written. It is selectable (the detail
    // GET returns it), but the only proposals UPDATE confirmed to succeed in
    // production — the admin send route — writes `status` + `sent_at` and
    // nothing else. Writing a column that may be trigger-maintained or
    // generated adds a failure mode this route does not need: `updated_at` is
    // not an approval timestamp, and if a trigger maintains it, it is
    // maintained either way. Reading it below is unchanged and proven safe.
    const { data: updated, error: updateError } = await adminClient
      .from('proposals')
      .update({ status: 'approved', accepted_at: now })
      .eq('id', proposalId)
      .eq('client_id', clientRow.id)
      .in('status', APPROVABLE_STATUSES)
      .select('id, proposal_number, title, status, accepted_at, updated_at')
      .maybeSingle()

    if (updateError) {
      // Log the FULL error server-side (SQLSTATE + message + details + hint):
      // a rejected write here is almost always a constraint or column problem,
      // and the previous generic log made it impossible to tell which.
      const code = (updateError as { code?: string }).code
      console.error(
        `❌ Failed to approve proposal ${proposalId} — code=${code ?? 'n/a'} message=${
          (updateError as { message?: string }).message ?? 'n/a'
        } details=${(updateError as { details?: string }).details ?? 'n/a'} hint=${
          (updateError as { hint?: string }).hint ?? 'n/a'
        }`,
      )
      // The SQLSTATE alone is returned to the caller — never the message,
      // details or hint, which can echo row data. It reaches only an
      // authenticated client who already owns this proposal, and turns an
      // unactionable "it failed" into a one-glance diagnosis.
      return NextResponse.json(
        { error: 'Failed to approve proposal', code: code ?? null },
        { status: 500 },
      )
    }

    if (!updated) {
      // Not owned, unknown, or not in an approvable state.
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Admin-scope notification through the trusted server-side writer.
    // recipientId is null = broadcast to every active admin. The helper derives
    // a deterministic idempotency key from (type, entityType, entityId, scope,
    // recipientId), so repeated approvals of the same proposal collapse to a
    // single notification row.
    //
    // A notification failure never rolls back the decision: the helper is
    // non-throwing by contract and the approval is already committed. Losing a
    // notification is recoverable; losing the client's decision is not.
    const clientLabel = clientRow.business_name || clientRow.full_name || 'A client'
    const notification = await createNotification({
      scope: 'admin',
      recipientId: null,
      type: 'proposal_approved',
      title: 'Proposal Approved',
      message: `${clientLabel} approved proposal ${updated.proposal_number || updated.title || ''}`.trim(),
      entityType: 'proposal',
      entityId: updated.id,
      link: `/admin/proposals/${updated.id}`,
    })

    // Non-fatal, consistent with the admin send route: the approval is already
    // committed and must not be reported as a failure because a notification
    // could not be written. The outcome is surfaced as `notified` instead of
    // being discarded silently.
    if (!notification.ok) {
      console.error(
        `⚠️ Proposal ${updated.id} approved but the admin notification was not created (${
          notification.skipped ?? 'unknown'
        })`,
      )
    }

    return NextResponse.json({
      success: true,
      proposal: {
        id: updated.id,
        status: updated.status,
        accepted_at: updated.accepted_at,
        updated_at: updated.updated_at,
      },
      notified: notification.ok === true,
    })
  } catch (error) {
    console.error('❌ Client proposal approve error:', error)
    return NextResponse.json({ error: 'Failed to approve proposal' }, { status: 500 })
  }
}
