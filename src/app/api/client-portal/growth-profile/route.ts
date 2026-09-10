// src/app/api/client-portal/growth-profile/route.ts
//
// GET — the caller's own Growth Profile, resolved entirely server-side.
//
// Replaces the browser-side resolution the portal page used to do, which tried
// four strategies in order: merchants.email = user.email, then
// merchant_accounts.email = user.email, then clients.merchant_id, and finally
// `user.user_metadata.merchant_id`. The first two authorised by email match;
// the last read a field the user can write themselves via
// supabase.auth.updateUser({ data: ... }), so a client could point it at
// another merchant. Both patterns are gone.
//
// The only authoritative chain is:
//
//   auth.uid()  ->  clients row (user_id)  ->  clients.merchant_id
//
// Nothing is resolved from an email address, a request parameter, or user
// metadata, and no candidate merchant is ever disclosed.
//
// AMBIGUITY IS REJECTED, NOT GUESSED. If the session resolves to more than one
// clients row, the request is refused rather than picking one.
//
// The response is an explicit allow-list of merchant-safe fields. Admin review
// notes, raw growth_reviews rows, internal decision fields and the unfiltered
// profile_data blob never leave the server.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Assessment review_status values that mean "Hbee has approved this merchant".
// Taken from the values that actually exist in the table
// (pending, in_review, reviewed, approved, rejected).
//
// `reviewed` is deliberately NOT included: a completed review is not the same
// decision as program approval, and treating it as approval would grant access
// to merchants who were reviewed but never approved. `growth_profiles.is_active`
// is likewise NOT treated as approval on its own — it marks which profile row is
// current, not whether the merchant was accepted.
const APPROVED_REVIEW_STATUSES = ['approved']

// ---------------------------------------------------------------------------
// HISTORICAL APPROVAL GATE — OFF BY DEFAULT. DO NOT REMOVE WITHOUT REVIEW.
//
// Stored `review_status = 'approved'` values cannot, on their own, evidence a
// deliberate program approval. At least two writers set that value without
// recording a decision: the old completion route, and a browser-side flow in
// admin/growth-assessments/[id] that wrote 'approved' for any completed
// review. Which writer produced any particular row is NOT established, and no
// separate decision field exists. This endpoint therefore must not read those
// values as an approval by themselves.
//
// So the release is gated. Until GROWTH_PROFILE_RELEASE_ENABLED is set to
// 'true' in the server environment, an otherwise-eligible merchant receives the
// `under_review` state instead of profile content. Nothing is approved,
// revoked, or rewritten by this flag — it only withholds content.
//
// Turning it on is a deliberate act that should follow an eligibility review of
// the existing approved rows (see the batch report). Because a real decision
// field does not exist yet, that review is a human step, not a query.
// ---------------------------------------------------------------------------
function isProfileReleaseEnabled(): boolean {
  return process.env.GROWTH_PROFILE_RELEASE_ENABLED === 'true'
}

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

/** Coerce a stored score into a number the UI can render, or null. */
function toScore(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Only the five known pillars are echoed back, each as a plain number. */
function safePillars(profileData: any): Record<string, number> | null {
  const pillars = profileData?.scores?.pillars
  if (!pillars || typeof pillars !== 'object') return null

  const allowed = ['visibility', 'conversion', 'retention', 'authority', 'scalability']
  const out: Record<string, number> = {}
  for (const key of allowed) {
    const n = toScore(pillars[key])
    if (n !== null) out[key] = n
  }
  return Object.keys(out).length > 0 ? out : null
}

/** Strings only, trimmed, bounded — never objects lifted out of a JSON blob. */
function safeStringList(value: unknown, max = 25): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max)
}

export async function GET() {
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

    // Authoritative link 1: session user -> clients row.
    // limit(2) rather than maybeSingle() so ambiguity is detectable and can be
    // refused explicitly instead of surfacing as a generic query error.
    const { data: clientRows, error: clientError } = await adminClient
      .from('clients')
      .select('id, merchant_id')
      .eq('user_id', user.id)
      .limit(2)

    if (clientError) {
      console.error(
        `[client-portal/growth-profile] client lookup failed (code=${
          (clientError as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Failed to load your profile' }, { status: 500 })
    }

    if (!clientRows || clientRows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (clientRows.length > 1) {
      // Ambiguous ownership: refuse rather than choose. No merchant is named.
      console.error(
        `[client-portal/growth-profile] ambiguous client ownership for user ${user.id}`,
      )
      return NextResponse.json({ state: 'ambiguous' }, { status: 409 })
    }

    const merchantId: string | null = clientRows[0].merchant_id ?? null

    // Authoritative link 2: clients.merchant_id. When it is absent the account
    // is simply not connected yet — an ordinary state for 5 of the 8 current
    // clients, not corruption. No candidate merchants are searched for or
    // returned, and nothing is linked by email.
    if (!merchantId) {
      return NextResponse.json({ state: 'not_connected' })
    }

    // Latest assessment for the linked merchant. `review_status` is the only
    // field used for a decision; nothing from growth_reviews is read here.
    const { data: assessmentRows } = await adminClient
      .from('growth_assessments')
      .select('id, review_status, created_at')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(1)

    const assessment = assessmentRows?.[0] ?? null

    if (!assessment) {
      return NextResponse.json({ state: 'no_assessment' })
    }

    if (assessment.review_status === 'rejected') {
      // Not "under review" — say nothing further, and do not leak review notes.
      return NextResponse.json({ state: 'not_available' })
    }

    const approved = APPROVED_REVIEW_STATUSES.includes(String(assessment.review_status))

    if (!approved) {
      // pending / in_review / reviewed — submitted, decision not yet issued.
      return NextResponse.json({ state: 'under_review' })
    }

    // Historical approvals are not trusted until the gate is opened. Withheld,
    // never rewritten.
    if (!isProfileReleaseEnabled()) {
      return NextResponse.json({ state: 'under_review' })
    }

    // Current profile for the merchant. is_active marks WHICH profile is
    // current; approval above is what grants access. A merchant approved
    // without a paid project reaches this point normally — no payment,
    // invoice or project state is consulted anywhere in this route.
    //
    // limit(2): more than one active profile for a merchant is an inconsistent
    // record, and the route must not pick one arbitrarily.
    const { data: profileRows } = await adminClient
      .from('growth_profiles')
      .select(
        'id, merchant_id, assessment_id, title, summary, hgri_score, growth_classification, profile_data, strengths, opportunities, created_at',
      )
      .eq('merchant_id', merchantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(2)

    if (profileRows && profileRows.length > 1) {
      console.error(
        `[client-portal/growth-profile] multiple active profiles for merchant ${merchantId}`,
      )
      return NextResponse.json({ state: 'inconsistent' }, { status: 409 })
    }

    const profile = profileRows?.[0] ?? null

    if (!profile) {
      return NextResponse.json({ state: 'under_review' })
    }

    // THREE-WAY BINDING. The profile must belong to the resolved merchant AND
    // to the very assessment that authorised access. Checking approval on one
    // assessment and then serving whatever active profile exists would let an
    // unrelated approved assessment expose a different profile — for example
    // after a reassessment, or if a profile row were ever written with a
    // mismatched merchant_id. Both are verified explicitly rather than assumed
    // from the query filters.
    if (String(profile.merchant_id) !== String(merchantId)) {
      console.error(
        `[client-portal/growth-profile] profile ${profile.id} merchant mismatch`,
      )
      return NextResponse.json({ state: 'inconsistent' }, { status: 409 })
    }

    if (!profile.assessment_id || String(profile.assessment_id) !== String(assessment.id)) {
      // The current profile was generated from a different assessment than the
      // one carrying the approval. No content is returned.
      console.error(
        `[client-portal/growth-profile] profile ${profile.id} is not bound to approving assessment ${assessment.id}`,
      )
      return NextResponse.json({ state: 'inconsistent' }, { status: 409 })
    }

    // Latest PDF, if one exists. file_url only — no storage path, no row.
    const { data: pdfRows } = await adminClient
      .from('growth_profile_pdfs')
      .select('file_url, uploaded_at')
      .eq('growth_profile_id', profile.id)
      .eq('is_latest', true)
      .order('uploaded_at', { ascending: false })
      .limit(1)

    const pdfUrl =
      typeof pdfRows?.[0]?.file_url === 'string' ? pdfRows[0].file_url : null

    // Explicit allow-list. profile_data is NOT forwarded as a blob: only the
    // five known pillar numbers and the recommendation strings are lifted out
    // of it, so any internal key added to that JSON in future cannot leak.
    return NextResponse.json({
      state: 'ready',
      profile: {
        id: profile.id,
        title: typeof profile.title === 'string' ? profile.title : null,
        summary: typeof profile.summary === 'string' ? profile.summary : null,
        hgri_score: toScore(profile.hgri_score),
        growth_classification:
          typeof profile.growth_classification === 'string'
            ? profile.growth_classification
            : null,
        pillars: safePillars(profile.profile_data),
        recommendations: safeStringList(profile.profile_data?.recommendations),
        strengths: safeStringList(profile.strengths),
        opportunities: safeStringList(profile.opportunities),
        created_at: profile.created_at,
        pdf_url: pdfUrl,
      },
    })
  } catch (error) {
    console.error('❌ Client growth profile error:', error)
    return NextResponse.json({ error: 'Failed to load your profile' }, { status: 500 })
  }
}
