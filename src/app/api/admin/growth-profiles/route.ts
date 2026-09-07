// src/app/api/admin/growth-profiles/route.ts
//
// Creates ONE growth profile from a reviewed assessment on behalf of an
// authenticated, 2FA-verified, active admin: it inserts the profile, advances
// the merchant lifecycle, mirrors the result onto the client record, and fires
// the client-facing "growth profile ready" notification through the trusted
// server-side writer.
//
// Batch N1c. GrowthProfileService.createFromAssessment() is imported by
// 'use client' pages, so it could never reach the service-role notification
// helper — it wrote the notification row straight from the browser instead,
// omitting every N0 column (recipient_scope, recipient_id, entity_type,
// entity_id, idempotency_key). That was the last browser-reachable writer of
// public.notifications. The service is now a thin client of this route, which
// owns the whole operation.
//
// Not covered by middleware.ts (its matcher is /admin/:path* and
// /client-portal/:path*, not /api/admin/:path*), so session, 2FA, and
// active-admin are all re-verified here independently, in the same order
// middleware uses for /admin/* pages.
//
// Nothing about identity is taken from the request: created_by is the session
// user, merchant_id is read from the stored assessment row, and the
// notification recipient is resolved server-side. Any client-supplied
// adminUserId, created_by, merchant_id, recipient_id or notification field is
// ignored.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
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

    const assessmentId =
      typeof body.assessment_id === 'string' ? body.assessment_id.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''

    if (!UUID_RE.test(assessmentId)) {
      return NextResponse.json({ error: 'A valid assessment is required' }, { status: 400 })
    }
    if (!title) {
      return NextResponse.json({ error: 'A profile title is required' }, { status: 400 })
    }

    const hgriScore = Number(body.hgri_score)
    if (!Number.isFinite(hgriScore)) {
      return NextResponse.json({ error: 'A valid HGRI score is required' }, { status: 400 })
    }

    const classification =
      typeof body.growth_classification === 'string' && body.growth_classification.trim()
        ? body.growth_classification.trim()
        : 'Growth Potential'

    // 5. Load the assessment with the trusted client. merchant_id is read from
    //    the stored row — a browser-supplied merchant_id is never honoured.
    const { data: assessment } = await adminClient
      .from('growth_assessments')
      .select('id, merchant_id')
      .eq('id', assessmentId)
      .maybeSingle()

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    const merchantId: string | null = assessment.merchant_id ?? null

    // 6. Create the growth profile. Same columns the browser wrote, except
    //    created_by is the server-derived admin id. The old path passed
    //    `review.reviewer_id || ''`, and an empty string into a uuid column
    //    raised 22P02 whenever reviewer_id was null — that failure mode is
    //    gone.
    const { data: profile, error: profileError } = await adminClient
      .from('growth_profiles')
      .insert({
        merchant_id: merchantId,
        assessment_id: assessmentId,
        title,
        summary: typeof body.summary === 'string' ? body.summary : '',
        hgri_score: hgriScore,
        growth_classification: classification,
        profile_data: body.profile_data ?? {},
        pdf_url: body.pdf_url || null,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (profileError || !profile) {
      console.error('❌ Failed to create growth profile:', profileError)
      return NextResponse.json({ error: 'Failed to create growth profile' }, { status: 500 })
    }

    // 7. Advance the merchant lifecycle and mirror the result onto the client
    //    record. Neither failure may undo the profile just created.
    if (merchantId) {
      const { error: statusError } = await adminClient
        .from('merchant_status')
        .update({
          status: 'growth_profile_ready',
          current_stage: 'growth_profile_ready',
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('merchant_id', merchantId)

      if (statusError) {
        console.error('⚠️ Profile created but merchant status update failed:', statusError)
      }

      const { error: clientUpdateError } = await adminClient
        .from('clients')
        .update({
          growth_profile_id: profile.id,
          hgri_score: hgriScore,
          growth_classification: classification,
        })
        .eq('merchant_id', merchantId)

      if (clientUpdateError) {
        console.error('⚠️ Profile created but client record update failed:', clientUpdateError)
      }
    }

    // 8. Client notification via the trusted server-side writer. recipient_id
    //    is resolved from the merchant here and never taken from the request.
    //    A missing client mapping is logged and skipped — no fabricated UUID —
    //    and never fails the request. No email in this batch.
    const recipientClientId = await resolveClientIdByMerchantId(merchantId)
    if (recipientClientId) {
      await createNotification({
        scope: 'client',
        recipientId: recipientClientId,
        legacyMerchantId: merchantId,
        type: 'growth_profile_ready',
        title: 'Growth Profile Ready',
        message: 'Your Growth Profile is now ready. Login to your client portal to view it.',
        entityType: 'growth_profile',
        entityId: profile.id,
        link: '/client-portal/growth-profile',
      })
    } else {
      console.warn(
        '[api/admin/growth-profiles] no client row for the assessment merchant; in-app notification skipped',
      )
    }

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error('❌ Growth profile creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
