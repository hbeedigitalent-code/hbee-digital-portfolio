// src/app/api/admin/proposals/route.ts
//
// Creates ONE proposal on behalf of an authenticated, 2FA-verified, active
// admin: it generates the NOT NULL proposal_number, inserts the row, advances
// the merchant lifecycle, and fires the client-facing "proposal ready"
// notification through the trusted server-side writer.
//
// P2 of the proposal-flow rebuild. /admin/proposals/new previously inserted the
// proposal from the browser (which failed with 23502 because nothing supplied
// proposal_number) and wrote the notification row directly from the browser via
// MerchantLifecycleService.createNotification(). The notification helper builds
// a service-role client, so it can never be reachable from a client bundle —
// the page POSTs here instead.
//
// Not covered by middleware.ts (its matcher is /admin/:path* and
// /client-portal/:path*, not /api/admin/:path*), so session, 2FA, and
// active-admin are all re-verified here independently, in the same order
// middleware uses for /admin/* pages.
//
// Nothing about identity or state is taken from the request: created_by is the
// session user, status is forced to 'draft', proposal_number is generated here,
// pricing.total is recomputed from the services, and the notification recipient
// is resolved from the merchant server-side. Any client-supplied created_by,
// proposal_number, status, client_id, user_id or notification field is ignored.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'
import {
  createNotification,
  resolveClientIdByMerchantId,
} from '@/lib/notifications/createNotification'

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_PROPOSAL_NUMBER_ATTEMPTS = 5

// PROP-YYYYMMDD-XXXXXX, suffix = 3 CSPRNG bytes rendered as 6 uppercase hex
// characters. The repo's only other identifier generator
// (src/lib/services/project-id-generator.ts) uses HBEE-YYYY-NNNN for *project*
// ids and derives the number from a row count, which races under concurrency;
// that convention is deliberately not copied for a different entity.
function buildProposalNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const suffix = randomBytes(3).toString('hex').toUpperCase()
  return `PROP-${year}${month}${day}-${suffix}`
}

// proposals.growth_profile_id is not referenced anywhere else in the codebase,
// so its existence cannot be assumed. Probe once per process with a cheap
// select and cache the answer; the column is included in the insert only when
// it is really there. This batch never adds it.
let growthProfileIdColumnPresent: boolean | null = null

async function proposalsHasGrowthProfileId(adminClient: any): Promise<boolean> {
  if (growthProfileIdColumnPresent !== null) return growthProfileIdColumnPresent

  const { error } = await adminClient.from('proposals').select('growth_profile_id').limit(1)
  growthProfileIdColumnPresent = !error

  if (error) {
    console.warn(
      '[api/admin/proposals] proposals.growth_profile_id is not present — the selected growth profile is validated but not persisted',
    )
  }

  return growthProfileIdColumnPresent
}

export async function POST(request: Request) {
  try {
    // 1. Derive the caller from THEIR OWN session — never a client-supplied
    //    id/email/role/isAdmin flag of any kind.
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 2. Verify the signed 2FA attestation cookie — the same function
    //    middleware uses, checked BEFORE any admin_users / service-role query.
    //    A missing, invalid or mismatched cookie gets the same generic 401.
    const cookieValue = cookies().get(ADMIN_2FA_COOKIE_NAME)?.value
    const twoFAVerified = await verifyAdmin2FACookie(cookieValue, user.id)
    if (!twoFAVerified) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = getServiceRoleClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 3. Active-admin status, verified server-side via the service-role
    //    client — never trusted from the browser.
    const { data: adminRow } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!adminRow) {
      return NextResponse.json({ error: 'Not authorized as admin' }, { status: 403 })
    }

    // 4. Validate the payload.
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const merchantId =
      typeof body.merchant_id === 'string' ? body.merchant_id.trim() : ''
    const growthProfileId =
      typeof body.growth_profile_id === 'string' ? body.growth_profile_id.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''

    if (!UUID_RE.test(merchantId)) {
      return NextResponse.json({ error: 'A valid merchant is required' }, { status: 400 })
    }
    if (!UUID_RE.test(growthProfileId)) {
      return NextResponse.json({ error: 'A valid growth profile is required' }, { status: 400 })
    }
    if (!title) {
      return NextResponse.json({ error: 'A proposal title is required' }, { status: 400 })
    }
    if (!Array.isArray(body.services) || body.services.length === 0) {
      return NextResponse.json({ error: 'At least one service is required' }, { status: 400 })
    }

    // Normalise the services to exactly the three fields the form owns, and
    // recompute the total here rather than trusting the browser's number.
    const services: Array<{ name: string; description: string; price: string }> = []
    let computedTotal = 0

    for (const raw of body.services as any[]) {
      const name = typeof raw?.name === 'string' ? raw.name.trim() : ''
      if (!name) {
        return NextResponse.json({ error: 'Every service needs a name' }, { status: 400 })
      }

      const rawPrice = raw?.price
      const price =
        typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice ?? ''))
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json(
          { error: 'Every service needs a valid, non-negative price' },
          { status: 400 },
        )
      }

      computedTotal += price
      services.push({
        name,
        description: typeof raw?.description === 'string' ? raw.description : '',
        price: String(rawPrice ?? ''),
      })
    }

    const requestPricing =
      body.pricing && typeof body.pricing === 'object' ? body.pricing : {}
    const pricing = {
      total: Number(computedTotal.toFixed(2)),
      payment_terms:
        typeof requestPricing.payment_terms === 'string' ? requestPricing.payment_terms : '',
      currency: 'USD',
    }

    // 5. The referenced merchant must exist.
    const { data: merchantRow } = await adminClient
      .from('merchants')
      .select('id')
      .eq('id', merchantId)
      .maybeSingle()

    if (!merchantRow) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    // 6. The referenced growth profile must exist, be active, and belong to
    //    that same merchant — the browser's pairing is never taken on trust.
    const { data: profileRow } = await adminClient
      .from('growth_profiles')
      .select('id, merchant_id, is_active')
      .eq('id', growthProfileId)
      .maybeSingle()

    if (!profileRow) {
      return NextResponse.json({ error: 'Growth profile not found' }, { status: 404 })
    }
    if (!profileRow.is_active) {
      return NextResponse.json(
        { error: 'The selected growth profile is not active' },
        { status: 400 },
      )
    }
    if (profileRow.merchant_id !== merchantId) {
      return NextResponse.json(
        { error: 'The selected growth profile does not belong to the selected merchant' },
        { status: 400 },
      )
    }

    // 7. Insert with a server-generated proposal_number. The number is
    //    pre-checked for collisions; a 23505 between the check and the insert
    //    triggers a bounded retry with a fresh number.
    const includeGrowthProfileId = await proposalsHasGrowthProfileId(adminClient)

    const basePayload: Record<string, any> = {
      merchant_id: merchantId,
      title,
      status: 'draft',
      services,
      pricing,
      timeline: typeof body.timeline === 'string' ? body.timeline : null,
      terms: typeof body.terms === 'string' ? body.terms : null,
      notes: typeof body.notes === 'string' ? body.notes : null,
      expires_at: body.expires_at || null,
      created_by: user.id,
    }

    if (includeGrowthProfileId) {
      basePayload.growth_profile_id = growthProfileId
    }

    let proposal: any = null
    let insertError: any = null

    for (let attempt = 0; attempt < MAX_PROPOSAL_NUMBER_ATTEMPTS; attempt++) {
      const candidate = buildProposalNumber()

      const { data: clash, error: clashError } = await adminClient
        .from('proposals')
        .select('id')
        .eq('proposal_number', candidate)
        .maybeSingle()

      if (clashError) {
        console.error('❌ proposal_number uniqueness check failed:', clashError)
        return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 })
      }
      if (clash) continue

      const { data, error } = await adminClient
        .from('proposals')
        .insert({ ...basePayload, proposal_number: candidate })
        .select()
        .single()

      if (!error && data) {
        proposal = data
        break
      }

      insertError = error
      // 23505 = unique_violation: another request claimed this number between
      // the check and the insert. Anything else is fatal.
      if (error?.code !== '23505') break
    }

    if (!proposal) {
      console.error('❌ Failed to create proposal:', insertError)
      return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 })
    }

    // 8. Advance the merchant lifecycle status. A failure here must not undo
    //    the proposal the admin just created.
    const { error: statusError } = await adminClient
      .from('merchant_status')
      .update({
        status: 'proposal_ready',
        current_stage: 'proposal_ready',
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('merchant_id', merchantId)

    if (statusError) {
      console.error('⚠️ Proposal created but merchant status update failed:', statusError)
    }

    // 9. Client notification via the trusted server-side writer. recipient_id
    //    is resolved from the merchant here and is never taken from the
    //    request. No direct notifications insert, no email in this batch.
    const recipientClientId = await resolveClientIdByMerchantId(merchantId)
    if (recipientClientId) {
      await createNotification({
        scope: 'client',
        recipientId: recipientClientId,
        legacyMerchantId: merchantId,
        type: 'proposal_ready',
        title: 'Proposal Ready',
        message: `Your proposal "${title}" is ready for review.`,
        entityType: 'proposal',
        entityId: proposal.id,
        link: `/client-portal/proposals/${proposal.id}`,
      })
    } else {
      console.warn(
        '[api/admin/proposals] no client row for the selected merchant; in-app notification skipped',
      )
    }

    return NextResponse.json({ success: true, proposal })
  } catch (error) {
    console.error('❌ Proposal creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
