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
import {
  createNotification,
  resolveClientIdByMerchantId,
} from '@/lib/notifications/createNotification'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'

// Session, user-bound 2FA, the privileged client and active-admin membership
// all come from requireActiveAdmin() now, so this module no longer builds its
// own service-role client or repeats the cookie check.
const UUID_RE = ADMIN_UUID_RE

const MAX_TITLE = 200
const MAX_SUMMARY = 4000
const MAX_CLASSIFICATION = 120
const MAX_PROFILE_DATA_BYTES = 100_000

/**
 * Absolute http(s) URLs only. Anything else — including javascript:, data:,
 * a relative path or a non-string — becomes null, so a stored value can never
 * be rendered as a hostile href.
 */
function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

// Explicit column list for the list view. Kept narrow rather than `*` so a
// column added to growth_profiles later is not published by accident.
const PROFILE_LIST_COLUMNS = `
  id, title, summary, hgri_score, growth_classification, is_active, created_at,
  merchant_id, assessment_id,
  merchant:merchants(id, business_name, contact_name, email, industry, country),
  assessment:growth_assessments(id, created_at, hgri_score, classification)
`

/**
 * GET — the growth profile list.
 *
 * Added in the admin access conversion batch. Replaces the direct browser query
 * in src/app/admin/growth-profiles/page.tsx, which read growth_profiles (with
 * merchants and growth_assessments embedded) as the caller's `authenticated`
 * role — outside the admin 2FA cookie check, which only this server can verify.
 *
 * The POST handler below is unchanged.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { db } = auth

    const filter = new URL(request.url).searchParams.get('filter') || 'all'
    if (!['all', 'active', 'archived'].includes(filter)) {
      return NextResponse.json({ error: 'Unsupported filter' }, { status: 400 })
    }

    let query = db
      .from('growth_profiles')
      .select(PROFILE_LIST_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(500)

    if (filter === 'active') query = query.eq('is_active', true)
    if (filter === 'archived') query = query.eq('is_active', false)

    const { data, error } = await query
    if (error) return queryFailure('growth profile list', error)

    return NextResponse.json({ profiles: data || [] })
  } catch (error) {
    console.error('[admin-api] growth profile list error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // 1-3. Session -> 401, user-bound 2FA -> 401 (before any admin_users
    //      query), privileged client -> 500, active admin_users row -> 403.
    //      This used to be duplicated inline here; it now runs through the one
    //      shared implementation so the ordering cannot drift from the other
    //      admin routes. The shared gate also denies (403) when the membership
    //      lookup itself errors, which the inline copy left implicit.
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const adminClient = auth.db
    const user = { id: auth.userId }

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
    if (!title || title.length > MAX_TITLE) {
      return NextResponse.json({ error: 'A profile title is required' }, { status: 400 })
    }

    // HGRI is a 0-100 whole number everywhere else in the app. Number.isFinite
    // alone accepted -1e9, 4.7 and 10000 into a column the admin and client UI
    // both render as a percentage.
    const hgriScore = Number(body.hgri_score)
    if (!Number.isInteger(hgriScore) || hgriScore < 0 || hgriScore > 100) {
      return NextResponse.json({ error: 'A valid HGRI score is required' }, { status: 400 })
    }

    // Bounded, matching the cap PATCH /api/admin/growth-reviews/[id] applies to
    // the same column.
    const classification =
      typeof body.growth_classification === 'string' && body.growth_classification.trim()
        ? body.growth_classification.trim().slice(0, MAX_CLASSIFICATION)
        : 'Growth Potential'

    const summary =
      typeof body.summary === 'string' ? body.summary.slice(0, MAX_SUMMARY) : ''

    // profile_data is stored as a blob and later read back by the client-portal
    // route, which re-sanitises it. Still refuse a non-object or an oversized
    // document rather than storing whatever arrives.
    const rawProfileData = body.profile_data ?? {}
    if (
      typeof rawProfileData !== 'object' ||
      rawProfileData === null ||
      Array.isArray(rawProfileData)
    ) {
      return NextResponse.json({ error: 'Invalid profile data' }, { status: 400 })
    }
    if (JSON.stringify(rawProfileData).length > MAX_PROFILE_DATA_BYTES) {
      return NextResponse.json({ error: 'Profile data is too large' }, { status: 400 })
    }

    // pdf_url is rendered as a link. Accept only absolute http(s) URLs, so a
    // stored javascript: or data: value can never reach an href.
    const pdfUrl = safeUrl(body.pdf_url)
    if (body.pdf_url != null && body.pdf_url !== '' && pdfUrl === null) {
      return NextResponse.json({ error: 'Invalid PDF URL' }, { status: 400 })
    }

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
        summary,
        hgri_score: hgriScore,
        growth_classification: classification,
        profile_data: rawProfileData,
        pdf_url: pdfUrl,
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
