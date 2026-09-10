// src/app/api/client-portal/proposals/[id]/request-changes/route.ts
//
// POST — the client asks for changes to their own proposal.
//
// Allowed from: sent, viewed. NOT from approved.
//
//   Reopening an approved proposal is a commercial reversal, and
//   src/lib/proposal-status.ts already models `approved` as terminal
//   (PROPOSAL_STATUS_TRANSITIONS.approved === []). Letting a client walk an
//   approved proposal backwards would contradict that vocabulary and could
//   undo work already started downstream. If the business wants it, it belongs
//   in the status module as an explicit transition, not smuggled in here.
//
// SCHEMA NOTE — the reason is deliberately NOT persisted on the proposal row.
// The only free-text column available is `notes`, which the admin UI labels
// "Internal Notes" / "Notes (Internal)". Writing client-authored text there
// would overwrite the admin's private notes and blur an internal field into a
// client-writable one. No suitable column exists, and this batch does not
// invent one or run SQL. The reason is instead carried in the admin
// notification message, which is admin-scoped and exactly where the admin will
// read it.
//
// Nothing commercial is read from the request: only `reason` is consumed, and
// only `status` / `updated_at` are written.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createNotification } from '@/lib/notifications/createNotification'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Changes may be requested only on a delivered, undecided proposal. */
const CHANGEABLE_STATUSES = ['sent', 'viewed']

const MAX_REASON_LENGTH = 2000
/** Trimmed length used inside the notification message. */
const REASON_PREVIEW_LENGTH = 500

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

/**
 * Strips control characters and collapses runaway whitespace before the text is
 * stored in a notification message and rendered in the admin UI. Tab (\x09) and
 * newline (\x0A) are preserved so a multi-paragraph request survives intact.
 */
function sanitizeReason(raw: string): string {
  return raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
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

    const body = await request.json().catch(() => null)
    const rawReason = typeof body?.reason === 'string' ? body.reason : ''
    const reason = sanitizeReason(rawReason)

    if (!reason) {
      return NextResponse.json(
        { error: 'Please describe the changes you would like.' },
        { status: 400 },
      )
    }
    if (reason.length > MAX_REASON_LENGTH) {
      return NextResponse.json(
        { error: `Please keep your request under ${MAX_REASON_LENGTH} characters.` },
        { status: 400 },
      )
    }

    const { data: clientRow } = await adminClient
      .from('clients')
      .select('id, business_name, full_name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!clientRow?.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Ownership AND the allowed-status precondition are enforced in the UPDATE
    // itself, so a proposal that is already approved matches zero rows.
    const { data: updated, error: updateError } = await adminClient
      .from('proposals')
      .update({ status: 'changes_requested', updated_at: new Date().toISOString() })
      .eq('id', proposalId)
      .eq('client_id', clientRow.id)
      .in('status', CHANGEABLE_STATUSES)
      .select('id, proposal_number, title, status, updated_at')
      .maybeSingle()

    if (updateError) {
      console.error('❌ Failed to request proposal changes:', updateError)
      return NextResponse.json({ error: 'Failed to submit your request' }, { status: 500 })
    }

    if (!updated) {
      // Not owned, unknown, or not in a changeable state (including already
      // approved) — one indistinguishable response.
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const clientLabel = clientRow.business_name || clientRow.full_name || 'A client'
    const preview =
      reason.length > REASON_PREVIEW_LENGTH
        ? `${reason.slice(0, REASON_PREVIEW_LENGTH)}...`
        : reason

    await createNotification({
      scope: 'admin',
      recipientId: null,
      type: 'proposal_changes_requested',
      title: 'Changes Requested',
      message: `${clientLabel} requested changes to proposal ${
        updated.proposal_number || updated.title || ''
      }: ${preview}`.trim(),
      entityType: 'proposal',
      entityId: updated.id,
      link: `/admin/proposals/${updated.id}`,
    })

    return NextResponse.json({
      success: true,
      proposal: {
        id: updated.id,
        status: updated.status,
        updated_at: updated.updated_at,
      },
    })
  } catch (error) {
    console.error('❌ Client proposal request-changes error:', error)
    return NextResponse.json({ error: 'Failed to submit your request' }, { status: 500 })
  }
}
