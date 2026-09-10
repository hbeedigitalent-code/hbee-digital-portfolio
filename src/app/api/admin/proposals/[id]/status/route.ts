// src/app/api/admin/proposals/[id]/status/route.ts
//
// POST — the trusted server-side proposal SEND transition.
//
// Replaces the browser-side `supabase.from('proposals').update({ status })`
// that previously backed the admin Send button. That write could mark a
// proposal `sent` while proposals.client_id was NULL, producing a proposal the
// admin believed was delivered but which no client account could ever open:
// every client route requires proposals.client_id = <caller's clients.id>, and
// that predicate can never match NULL.
//
// This route makes the client link a hard precondition of sending.
//
// Not covered by middleware.ts (its matcher is /admin/:path*,
// /admin-2fa-challenge and /client-portal/:path*, not /api/admin/:path*), so
// session, 2FA and active-admin are re-verified here independently.
//
// SCOPE — this route implements two transitions, each in its own branch:
//
//   sent     — unchanged from the batch that introduced this route.
//   approved — added so the merchant lifecycle write stops happening in the
//              browser. admin/proposals/[id] used to call
//              MerchantLifecycleService.updateStatus() directly against
//              merchant_status, a table the access lockdown closes to the
//              browser entirely.
//
// `viewed`, `changes_requested` and every other target are still rejected with
// a 400 and are still performed by the existing admin page code, unchanged.
//
// THIS IS NOT A LIFECYCLE ENDPOINT. There is no merchant status parameter. The
// approved branch sets exactly one lifecycle value, `proposal_accepted`, on the
// merchant read from the STORED proposal row. A caller cannot name a merchant
// or name a status.
//
// Nothing commercial or identity-bearing is read from the request body. Only
// `status` is consumed; merchant_id, client_id, created_by, sent_at, pricing,
// services, terms and title have no path into the query. client_id is read
// from the stored row, never from the caller.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'
import { PROPOSAL_STATUS_TRANSITIONS, isProposalStatus } from '@/lib/proposal-status'
import { createNotification } from '@/lib/notifications/createNotification'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The target statuses this route implements.
const SUPPORTED_TARGET = 'sent'
const APPROVED_TARGET = 'approved'
const SUPPORTED_TARGETS = [SUPPORTED_TARGET, APPROVED_TARGET] as const

// The single merchant lifecycle value the approved branch may set. Hard-coded
// on purpose: no request can choose a different one.
const ACCEPTED_LIFECYCLE_STATUS = 'proposal_accepted'

// Statuses from which `sent` is reachable, derived from the single source of
// truth in src/lib/proposal-status.ts rather than hard-coded here, so the route
// cannot drift from the vocabulary the admin UI renders its buttons from.
//
// Today this resolves to ['draft', 'changes_requested']: a first send, and a
// re-send after the client asked for changes and the admin revised the
// proposal. Restricting it to 'draft' alone would leave the existing
// changes_requested -> sent button failing, so the vocabulary is honoured.
const SENDABLE_FROM = (
  Object.keys(PROPOSAL_STATUS_TRANSITIONS) as Array<keyof typeof PROPOSAL_STATUS_TRANSITIONS>
).filter((from) =>
  (PROPOSAL_STATUS_TRANSITIONS[from] as readonly string[]).includes(SUPPORTED_TARGET),
) as string[]

// Statuses from which `approved` is reachable, derived the same way. Today
// this resolves to ['viewed'] — the admin marks a proposal viewed, then
// approves it — which is exactly what the admin page's own transition buttons
// already offer, so no button changes behaviour.
const APPROVABLE_FROM = (
  Object.keys(PROPOSAL_STATUS_TRANSITIONS) as Array<keyof typeof PROPOSAL_STATUS_TRANSITIONS>
).filter((from) =>
  (PROPOSAL_STATUS_TRANSITIONS[from] as readonly string[]).includes(APPROVED_TARGET),
) as string[]

// Lazy, non-throwing service-role client — the same defensive pattern used by
// the other /api/admin routes. Deliberately NOT the shared
// src/lib/supabaseAdmin.ts singleton, which throws at import time when
// SUPABASE_SERVICE_ROLE_KEY is missing.
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

type AuthResult =
  | { ok: true; adminClient: any; userId: string }
  | { ok: false; response: NextResponse }

async function requireActiveAdmin(): Promise<AuthResult> {
  // 1-2. Derive the caller from THEIR OWN session — never a client-supplied
  //      id / email / role / isAdmin flag of any kind.
  const sessionClient = createServerSupabaseClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  // 3-4. Verify the signed 2FA attestation cookie — the same function
  //      middleware uses, checked BEFORE any admin_users / service-role query,
  //      and returning the SAME generic 401 so a missing cookie is
  //      indistinguishable from a missing session.
  const cookieValue = cookies().get(ADMIN_2FA_COOKIE_NAME)?.value
  const twoFAVerified = await verifyAdmin2FACookie(cookieValue, user.id)
  if (!twoFAVerified) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  // 5. Service-role client obtained only AFTER session + 2FA succeed.
  const adminClient = getServiceRoleClient()
  if (!adminClient) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }),
    }
  }

  // 6. Active-admin status, verified server-side.
  const { data: adminRow } = await adminClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!adminRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authorized as admin' }, { status: 403 }),
    }
  }

  return { ok: true, adminClient, userId: user.id }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { adminClient } = auth

    const proposalId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(proposalId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Only `status` is read from the body. Every other field is ignored.
    const body = await request.json().catch(() => null)
    const targetStatus = typeof body?.status === 'string' ? body.status.trim() : ''

    if (!isProposalStatus(targetStatus)) {
      return NextResponse.json({ error: 'Unknown proposal status' }, { status: 400 })
    }

    if (!(SUPPORTED_TARGETS as readonly string[]).includes(targetStatus)) {
      // Explicit, not silent: this route implements these transitions only.
      return NextResponse.json(
        {
          error: `This endpoint only performs the ${SUPPORTED_TARGETS.map(
            (t) => `"${t}"`,
          ).join(' and ')} transitions.`,
        },
        { status: 400 },
      )
    }

    // Read the stored row. client_id comes from here and from nowhere else.
    const { data: proposal, error: readError } = await adminClient
      .from('proposals')
      .select('id, proposal_number, title, status, client_id, merchant_id, sent_at, accepted_at')
      .eq('id', proposalId)
      .maybeSingle()

    if (readError) {
      console.error('❌ Failed to read proposal for send:', readError)
      return NextResponse.json({ error: 'Failed to send proposal' }, { status: 500 })
    }

    if (!proposal) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // -----------------------------------------------------------------
    // APPROVED BRANCH
    //
    // Moved here from the browser. admin/proposals/[id] previously did the
    // proposals update itself and then called
    // MerchantLifecycleService.updateStatus(proposal.merchant_id, ...) with a
    // merchant id it had loaded into page state.
    //
    // The merchant now comes from the STORED proposal row read above. No
    // merchant id and no lifecycle status reaches this code from the request.
    // -----------------------------------------------------------------
    if (targetStatus === APPROVED_TARGET) {
      if (proposal.status === APPROVED_TARGET) {
        return NextResponse.json(
          { error: 'This proposal has already been approved.', status: proposal.status },
          { status: 409 },
        )
      }

      if (!APPROVABLE_FROM.includes(proposal.status)) {
        return NextResponse.json(
          {
            error: `A proposal cannot be approved from the "${proposal.status}" status.`,
            status: proposal.status,
          },
          { status: 409 },
        )
      }

      const approvedAt = new Date().toISOString()

      // The allowed-status precondition is repeated INSIDE the update, so a
      // concurrent transition between the read and the write cannot slip
      // through. Only status and accepted_at are written; accepted_at is the
      // existing timestamp column and this batch adds no columns.
      const { data: approved, error: approveError } = await adminClient
        .from('proposals')
        .update({ status: APPROVED_TARGET, accepted_at: approvedAt })
        .eq('id', proposalId)
        .in('status', APPROVABLE_FROM)
        .select('id, status, accepted_at, merchant_id')
        .maybeSingle()

      if (approveError) {
        console.error(
          `❌ Failed to approve proposal (code=${
            (approveError as { code?: string }).code ?? 'n/a'
          })`,
        )
        return NextResponse.json({ error: 'Failed to approve proposal' }, { status: 500 })
      }

      if (!approved) {
        return NextResponse.json(
          { error: 'This proposal is no longer in an approvable status.' },
          { status: 409 },
        )
      }

      // ---------------------------------------------------------------
      // LIFECYCLE UPDATE — a SEPARATE statement against a SEPARATE table.
      //
      // These two writes are NOT atomic with each other. The proposal is
      // already approved and committed by the time this runs; if the
      // lifecycle write fails, the approval stands and the response says so
      // explicitly rather than reporting an unqualified success. The admin
      // can retry, and re-approving is refused with a 409 while the lifecycle
      // state is reported here, so nothing is silently left half-done.
      // ---------------------------------------------------------------
      const merchantId = approved.merchant_id ?? proposal.merchant_id ?? null
      let lifecycle: 'updated' | 'not_linked' | 'no_status_row' | 'failed' = 'not_linked'

      if (merchantId && UUID_RE.test(String(merchantId))) {
        const { data: lifecycleRow, error: lifecycleError } = await adminClient
          .from('merchant_status')
          .update({
            status: ACCEPTED_LIFECYCLE_STATUS,
            current_stage: ACCEPTED_LIFECYCLE_STATUS,
            last_activity: approvedAt,
            updated_at: approvedAt,
          })
          .eq('merchant_id', merchantId)
          .select('merchant_id')
          .maybeSingle()

        if (lifecycleError) {
          console.error(
            `⚠️ Proposal ${approved.id} approved but the merchant lifecycle update failed (code=${
              (lifecycleError as { code?: string }).code ?? 'n/a'
            })`,
          )
          lifecycle = 'failed'
        } else if (!lifecycleRow) {
          // No merchant_status row exists for this merchant. Nothing is
          // created here — provisioning a lifecycle row is not this route's
          // job — but the admin is told.
          console.error(
            `⚠️ Proposal ${approved.id} approved but merchant ${merchantId} has no merchant_status row`,
          )
          lifecycle = 'no_status_row'
        } else {
          lifecycle = 'updated'
        }
      }

      return NextResponse.json({
        success: true,
        proposal: {
          id: approved.id,
          status: approved.status,
          accepted_at: approved.accepted_at,
        },
        // Reported separately and honestly. `success` refers to the proposal
        // approval, which is what was committed.
        lifecycle,
      })
    }

    if (proposal.status === SUPPORTED_TARGET) {
      // Already sent. No second update and NO second notification.
      return NextResponse.json(
        { error: 'This proposal has already been sent.', status: proposal.status },
        { status: 409 },
      )
    }

    if (!SENDABLE_FROM.includes(proposal.status)) {
      return NextResponse.json(
        {
          error: `A proposal cannot be sent from the "${proposal.status}" status.`,
          status: proposal.status,
        },
        { status: 409 },
      )
    }

    // HARD PRECONDITION — the defect this route exists to close. A proposal
    // with no client_id can never be opened by anyone in the portal, so it must
    // not be presentable as "Sent".
    if (!UUID_RE.test(String(proposal.client_id ?? ''))) {
      return NextResponse.json(
        {
          error:
            'This proposal is not linked to a client portal account yet, so it cannot be sent. Link the merchant to a client account first.',
          code: 'client_not_linked',
        },
        { status: 400 },
      )
    }

    const clientId = String(proposal.client_id)
    const now = new Date().toISOString()

    // The allowed-status precondition is repeated INSIDE the update, so a
    // concurrent send or a status change between the read and the write cannot
    // slip through. Only status and sent_at are written.
    const { data: updated, error: updateError } = await adminClient
      .from('proposals')
      .update({ status: SUPPORTED_TARGET, sent_at: now })
      .eq('id', proposalId)
      .in('status', SENDABLE_FROM)
      .select('id, proposal_number, title, status, sent_at')
      .maybeSingle()

    if (updateError) {
      console.error('❌ Failed to send proposal:', updateError)
      return NextResponse.json({ error: 'Failed to send proposal' }, { status: 500 })
    }

    if (!updated) {
      // Lost a race: something else moved the row out of a sendable status.
      return NextResponse.json(
        { error: 'This proposal is no longer in a sendable status.' },
        { status: 409 },
      )
    }

    // Exactly one client-scope notification, through the trusted server-side
    // writer. recipientId is the clients.id read from the stored proposal.
    //
    // The helper derives a deterministic idempotency key from
    // (type, entityType, entityId, scope, recipientId), so even if this route
    // were reached twice for the same proposal the second insert collapses onto
    // the first rather than creating a duplicate.
    //
    // A notification failure never rolls back the send: the helper is
    // non-throwing by contract and the transition is already committed. No
    // email is sent.
    const label = updated.proposal_number || updated.title || 'your proposal'
    const notification = await createNotification({
      scope: 'client',
      recipientId: clientId,
      type: 'proposal_sent',
      title: 'New Proposal from Hbee Digitals',
      message: `Hbee Digitals has sent you proposal ${label}. Review it and approve or request changes.`,
      entityType: 'proposal',
      entityId: updated.id,
      link: `/client-portal/proposals/${updated.id}`,
    })

    if (!notification.ok) {
      console.error(
        `⚠️ Proposal ${updated.id} sent but the client notification was not created (${
          notification.skipped ?? 'unknown'
        })`,
      )
    }

    return NextResponse.json({
      success: true,
      proposal: {
        id: updated.id,
        status: updated.status,
        sent_at: updated.sent_at,
      },
      notified: notification.ok === true,
    })
  } catch (error) {
    console.error('❌ Admin proposal status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
