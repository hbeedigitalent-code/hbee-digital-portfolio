// src/app/api/growth-reviews/[id]/complete/route.ts
//
// POST — complete a growth review and generate the merchant's Growth Profile.
// ACTIVE ADMINS ONLY.
//
// Before this change the route had no authentication of any kind, and it took
// `merchant_id` and `assessment_id` straight from the request body. Any
// anonymous caller could therefore fabricate a Growth Profile with arbitrary
// scores, mark any assessment reviewed, and overwrite an existing merchant's
// profile — choosing which records to write via the body.
//
// Two things changed. Authorization now runs first, and the merchant/assessment
// relationships are DERIVED FROM THE STORED growth_reviews ROW addressed by the
// route parameter. Caller-supplied ids are no longer trusted: if they are sent
// at all they must match the stored row, and a mismatch is rejected before any
// write.
//
// Not covered by middleware.ts (its matcher is /admin/:path*,
// /admin-2fa-challenge and /client-portal/:path*, not /api/*), so session, 2FA
// and active-admin are verified here independently.
//
// DATA ACCESS NOW USES A SERVER-ONLY PRIVILEGED CLIENT.
//
// The previous version ran every read and write on an anonymous client, which
// only worked because growth_reviews / growth_profiles / merchant_status had
// RLS disabled with broad anon grants. Those grants are being removed. Because
// this endpoint is now provably admin-only — session, user-bound 2FA and active
// admin_users membership are all verified above any data access — the privileged
// client is the correct role here, and it keeps the route working after the
// lockdown SQL is applied.
//
// This is NOT a generic privileged API: the review is addressed by the route
// parameter, every relationship is read back from the stored row, and no table
// name, filter or column list comes from the request.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'
import {
  createNotification,
  resolveClientIdByMerchantId,
} from '@/lib/notifications/createNotification'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Lazy, non-throwing privileged client. Built once and used for BOTH the
// admin_users membership lookup and this route's own review/assessment/profile
// operations — see the header note. Deliberately NOT the shared
// src/lib/supabaseAdmin.ts singleton, which throws at import time when
// SUPABASE_SERVICE_ROLE_KEY is missing.
let privilegedClient: any = null

function getPrivilegedClient() {
  if (privilegedClient) return privilegedClient

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null

  privilegedClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return privilegedClient
}

type AuthResult = { ok: true } | { ok: false; response: NextResponse }

/**
 * Session + user-bound 2FA attestation + active admin_users membership.
 * Fails closed at every step, including when the membership lookup itself
 * errors — a lookup that cannot answer "yes" is never read as "yes".
 */
async function requireActiveAdmin(): Promise<AuthResult> {
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

  // Checked BEFORE any admin_users query, returning the SAME generic 401 as a
  // missing session. verifyAdmin2FACookie fails closed on a missing secret.
  const cookieValue = cookies().get(ADMIN_2FA_COOKIE_NAME)?.value
  const twoFAVerified = await verifyAdmin2FACookie(cookieValue, user.id)
  if (!twoFAVerified) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  const adminClient = getPrivilegedClient()
  if (!adminClient) {
    console.error('[growth-reviews/complete] privileged client unavailable — denied')
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }),
    }
  }

  const { data: adminRow, error: adminLookupError } = await adminClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (adminLookupError) {
    console.error(
      `[growth-reviews/complete] admin membership lookup failed (code=${
        (adminLookupError as { code?: string }).code ?? 'n/a'
      }) — denied`,
    )
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authorized' }, { status: 403 }),
    }
  }

  if (!adminRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authorized' }, { status: 403 }),
    }
  }

  return { ok: true }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // AUTHORIZATION FIRST — before the body is parsed, before the review is
    // loaded, and before any write. This also builds (and validates) the
    // privileged client that every operation below uses.
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response

    const supabase = getPrivilegedClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { id } = params
    if (!UUID_RE.test(typeof id === 'string' ? id.trim() : '')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Malformed JSON must not surface as an unhandled 500.
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const {
      review_notes,
      hgri_score,
      growth_classification,
      strengths,
      opportunities,
      visibility_score,
      conversion_score,
      retention_score,
      authority_score,
      scalability_score,
    } = body

    // RELATIONSHIPS COME FROM THE STORED ROW, NOT THE CALLER.
    // The route parameter identifies the review; merchant_id and assessment_id
    // are read from it. This read runs on the same anonymous client as every
    // other data operation here, so the data-access role is unchanged.
    const { data: reviewRow, error: reviewLoadError } = await supabase
      .from('growth_reviews')
      .select('id, merchant_id, assessment_id, status')
      .eq('id', id)
      .maybeSingle()

    if (reviewLoadError) {
      console.error(
        `[growth-reviews/complete] review load failed (code=${
          (reviewLoadError as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Failed to load review' }, { status: 500 })
    }

    if (!reviewRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const merchant_id: string | null = reviewRow.merchant_id ?? null
    const assessment_id: string | null = reviewRow.assessment_id ?? null

    if (!merchant_id || !assessment_id) {
      // A review with no stored relationships cannot be completed safely; the
      // route will not invent them from the request.
      console.error(
        `[growth-reviews/complete] review ${id} has no stored merchant_id/assessment_id`,
      )
      return NextResponse.json(
        { error: 'This review is not linked to a merchant and assessment.' },
        { status: 409 },
      )
    }

    // The admin UI still sends these for backwards compatibility. They are not
    // used for any write — they are only checked against the stored row, and a
    // mismatch is rejected before anything is written.
    const claimedMerchantId = (body as { merchant_id?: unknown }).merchant_id
    const claimedAssessmentId = (body as { assessment_id?: unknown }).assessment_id

    if (
      (typeof claimedMerchantId === 'string' && claimedMerchantId !== merchant_id) ||
      (typeof claimedAssessmentId === 'string' && claimedAssessmentId !== assessment_id)
    ) {
      console.error(
        `[growth-reviews/complete] relationship mismatch for review ${id} — rejected`,
      )
      return NextResponse.json(
        { error: 'Review relationship mismatch' },
        { status: 409 },
      )
    }

    // 1. Update the review status to completed
    const { error: reviewError } = await supabase
      .from('growth_reviews')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        review_notes,
        hgri_score,
        growth_classification,
        strengths: strengths || [],
        opportunities: opportunities || [],
        visibility_score: visibility_score || 0,
        conversion_score: conversion_score || 0,
        retention_score: retention_score || 0,
        authority_score: authority_score || 0,
        scalability_score: scalability_score || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (reviewError) {
      console.error('Review update error:', reviewError)
      return NextResponse.json(
        { error: 'Failed to update review' },
        { status: 500 }
      )
    }

    // 2. Update the assessment
    await supabase
      .from('growth_assessments')
      .update({
        review_status: 'approved',
        hgri_score: hgri_score || 0,
        growth_classification: growth_classification || 'Growth Potential',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', assessment_id)

    // 3. Generate the growth profile
    const profileData = {
      scores: {
        pillars: {
          visibility: visibility_score || 0,
          conversion: conversion_score || 0,
          retention: retention_score || 0,
          authority: authority_score || 0,
          scalability: scalability_score || 0
        },
        hgri: hgri_score || 0
      },
      recommendations: generateRecommendations({
        visibility_score: visibility_score || 0,
        conversion_score: conversion_score || 0,
        retention_score: retention_score || 0,
        authority_score: authority_score || 0,
        scalability_score: scalability_score || 0
      })
    }

    // Get merchant name
    const { data: merchant } = await supabase
      .from('merchants')
      .select('business_name')
      .eq('id', merchant_id)
      .single()

    const merchantName = merchant?.business_name || 'Business'

    // Create the growth profile
    const { data: profile, error: profileError } = await supabase
      .from('growth_profiles')
      .insert({
        merchant_id,
        assessment_id,
        title: `${merchantName} - Growth Profile`,
        summary: generateSummary(merchantName, growth_classification || 'Growth Potential'),
        hgri_score: hgri_score || 0,
        growth_classification: growth_classification || 'Growth Potential',
        profile_data: profileData,
        strengths: strengths || [],
        opportunities: opportunities || [],
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json(
        { error: 'Failed to create growth profile' },
        { status: 500 }
      )
    }

    // 4. Update merchant status
    await supabase
      .from('merchant_status')
      .upsert({
        merchant_id,
        status: 'growth_profile_ready',
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'merchant_id' })

    // 5. Create the client notification via the trusted server-side helper.
    //    Resolve the authoritative clients.id from the legacy merchant_id; if
    //    no client row exists, skip the in-app notification (no fabricated
    //    UUID) and preserve the rest of the completion flow.
    const resolvedClientId = await resolveClientIdByMerchantId(merchant_id)
    if (resolvedClientId) {
      await createNotification({
        scope: 'client',
        recipientId: resolvedClientId,
        legacyMerchantId: merchant_id,
        type: 'growth_profile_ready',
        title: 'Growth Profile Ready',
        message: `Your Growth Profile is ready! You have been classified as ${growth_classification || 'Growth Potential'}.`,
        entityType: 'growth_profile',
        entityId: profile.id,
        link: '/client-portal/growth-profile',
      })
    } else {
      console.warn(
        `[growth-reviews/${id}/complete] no client row for merchant ${merchant_id}; in-app notification skipped`,
      )
    }

    // 6. Update client record
    await supabase
      .from('clients')
      .update({
        growth_profile_id: profile.id,
        hgri_score: hgri_score || 0,
        growth_classification: growth_classification || 'Growth Potential'
      })
      .eq('merchant_id', merchant_id)

    return NextResponse.json({
      success: true,
      profile_id: profile.id,
      message: 'Review completed and profile generated'
    })

  } catch (error) {
    console.error('Complete review error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateSummary(businessName: string, classification: string): string {
  const summaries: Record<string, string> = {
    'Foundation': `${businessName} is in the Foundation stage. The business has established core operations but has significant growth opportunities ahead. Focus on building visibility and conversion systems.`,
    'Foundation Stage': `${businessName} is in the Foundation stage. The business has established core operations but has significant growth opportunities ahead. Focus on building visibility and conversion systems.`,
    'Growth Potential': `${businessName} shows strong Growth Potential. The business has solid fundamentals and is ready to scale with the right strategies in place.`,
    'Growth Ready': `${businessName} is Growth Ready. The business has proven systems, strong customer engagement, and is positioned for significant expansion.`,
    'Scale Ready': `${businessName} is Scale Ready. The business demonstrates exceptional operational maturity, brand authority, and is prepared for rapid scaling.`
  }
  return summaries[classification] || `${businessName} shows promising growth characteristics.`
}

function generateRecommendations(data: any): string[] {
  const recommendations: string[] = []
  
  if (data.visibility_score < 50) {
    recommendations.push('Implement a comprehensive SEO strategy to improve organic visibility')
    recommendations.push('Leverage content marketing to build brand awareness')
  }
  if (data.conversion_score < 50) {
    recommendations.push('Optimize website user experience and conversion funnel')
    recommendations.push('Implement A/B testing to improve conversion rates')
  }
  if (data.retention_score < 50) {
    recommendations.push('Build an email marketing automation system')
    recommendations.push('Implement customer loyalty and retention programs')
  }
  if (data.authority_score < 50) {
    recommendations.push('Develop a content strategy to build industry authority')
    recommendations.push('Leverage social proof and customer testimonials')
  }
  if (data.scalability_score < 50) {
    recommendations.push('Build scalable systems and processes for growth')
    recommendations.push('Implement automation tools to reduce manual work')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Continue optimizing current growth strategies')
    recommendations.push('Explore new channels for customer acquisition')
  }
  
  return recommendations
}