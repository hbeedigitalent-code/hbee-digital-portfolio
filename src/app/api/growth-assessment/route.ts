// src/app/api/growth-assessment/route.ts
// No 'use client' needed - API route

import { NextRequest, NextResponse } from 'next/server'
import { 
  calculateVisibilityScore,
  calculateConversionScore,
  calculateRetentionScore,
  calculateAuthorityScore,
  calculateScalabilityScore,
  calculateHGRI,
  detectPrimaryConstraint
} from '@/lib/scoring/hgri-scoring'
import { FormData } from '@/types/growth-readiness'
import { createNotification } from '@/lib/notifications/createNotification'

// Lazy initialize Supabase client
let supabaseAdmin: any = null

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables are not set')
    return null
  }
  
  // Dynamic import to avoid build-time issues
  const { createClient } = require('@supabase/supabase-js')
  supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  return supabaseAdmin
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin()
  
  // Check if Supabase is configured
  if (!supabase) {
    console.error('Supabase not configured - missing environment variables')
    return NextResponse.json(
      { error: 'Server configuration error. Please check environment variables.' },
      { status: 500 }
    )
  }

  try {
    const body: FormData = await request.json()

    // Validate required fields
    const requiredFields = [
      'business_name', 'website', 'contact_name', 'email', 
      'country', 'industry', 'business_stage', 'store_age',
      'primary_goals', 'success_vision', 'marketing_channels',
      'best_channel', 'paid_ads_usage', 'visibility_confidence',
      'email_capture', 'email_automations', 'customer_reviews',
      'content_publishing', 'upsells_crosssells', 'biggest_challenge',
      'main_obstacle', 'support_type', 'improvement_timeline', 'consent'
    ]

    const missingFields = requiredFields.filter(field => {
      const value = body[field as keyof FormData]
      return value === undefined || value === null || value === ''
    })

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    if (!body.consent) {
      return NextResponse.json(
        { error: 'Consent is required' },
        { status: 400 }
      )
    }

    // Prepare scoring input
    const scoringInput = {
      marketingChannels: body.marketing_channels || [],
      contentPublishing: body.content_publishing || '',
      visibilityConfidence: body.visibility_confidence || 0,
      businessStage: body.business_stage || '',
      customerReviews: body.customer_reviews || '',
      upsellsCrosssells: body.upsells_crosssells || '',
      primaryGoals: body.primary_goals || [],
      emailCapture: body.email_capture || '',
      emailAutomations: body.email_automations || '',
      improvementTimeline: body.improvement_timeline || '',
      supportType: body.support_type || ''
    }

    // Calculate scores
    const visibilityScore = calculateVisibilityScore(scoringInput)
    const conversionScore = calculateConversionScore(scoringInput)
    const retentionScore = calculateRetentionScore(scoringInput)
    const authorityScore = calculateAuthorityScore(scoringInput)
    const scalabilityScore = calculateScalabilityScore(scoringInput)
    
    const { total: hgriScore, classification } = calculateHGRI(
      visibilityScore,
      conversionScore,
      retentionScore,
      authorityScore,
      scalabilityScore
    )

    const { constraint: primaryConstraint, focus: recommendedFocus } = 
      detectPrimaryConstraint(scoringInput)

    // 1. Check if merchant exists
    let merchantId: string
    
    const { data: existingMerchant, error: lookupError } = await supabase
      .from('merchants')
      .select('id')
      .eq('email', body.email)
      .single()

    if (lookupError && lookupError.code !== 'PGRST116') {
      console.error('Merchant lookup error:', lookupError)
      return NextResponse.json(
        { error: 'Failed to lookup merchant' },
        { status: 500 }
      )
    }

    if (existingMerchant) {
      merchantId = existingMerchant.id
    } else {
      // Create merchant
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .insert({
          business_name: body.business_name,
          website: body.website,
          contact_name: body.contact_name,
          email: body.email,
          country: body.country,
          industry: body.industry,
          business_stage: body.business_stage,
          store_age: body.store_age
        })
        .select()
        .single()

      if (merchantError) {
        console.error('Merchant creation error:', merchantError)
        return NextResponse.json(
          { error: 'Failed to create merchant record' },
          { status: 500 }
        )
      }
      merchantId = merchant.id
    }

    // 2. Create growth assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from('growth_assessments')
      .insert({
        merchant_id: merchantId,
        primary_goals: body.primary_goals,
        success_vision: body.success_vision,
        marketing_channels: body.marketing_channels,
        best_channel: body.best_channel,
        paid_ads_usage: body.paid_ads_usage,
        paid_ad_platforms: body.paid_ad_platforms || [],
        visibility_confidence: body.visibility_confidence,
        email_capture: body.email_capture,
        email_automations: body.email_automations,
        customer_reviews: body.customer_reviews,
        content_publishing: body.content_publishing,
        upsells_crosssells: body.upsells_crosssells,
        biggest_challenge: body.biggest_challenge,
        main_obstacle: body.main_obstacle,
        support_type: body.support_type,
        improvement_timeline: body.improvement_timeline,
        visibility_score: visibilityScore,
        conversion_score: conversionScore,
        retention_score: retentionScore,
        authority_score: authorityScore,
        scalability_score: scalabilityScore,
        hgri_score: hgriScore,
        classification: classification,
        primary_constraint: primaryConstraint,
        recommended_focus: recommendedFocus,
        raw_answers_json: body,
        status: 'New Submission',
        review_status: 'pending'
      })
      .select()
      .single()

    if (assessmentError) {
      console.error('Assessment creation error:', assessmentError)
      return NextResponse.json(
        { error: 'Failed to create assessment record' },
        { status: 500 }
      )
    }

    // 3. Create merchant status record
    const { error: statusError } = await supabase
      .from('merchant_status')
      .upsert({
        merchant_id: merchantId,
        status: 'assessment_submitted',
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'merchant_id' })

    if (statusError) {
      console.error('Merchant status creation error:', statusError)
      // Don't fail the request, just log
    }

    // 4. Create growth review record
    const { data: review, error: reviewError } = await supabase
      .from('growth_reviews')
      .insert({
        merchant_id: merchantId,
        assessment_id: assessment.id,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (reviewError) {
      console.error('Review creation error:', reviewError)
      // Don't fail the request, just log
    }

    // 5. Send confirmation email to merchant using HOS template
    try {
      const { sendAssessmentReceivedEmail } = await import('@/lib/emails/hos/assessment-received')
      await sendAssessmentReceivedEmail({
        firstName: body.contact_name.split(' ')[0] || body.contact_name,
        email: body.email,
        assessmentId: assessment.id,
        portalUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hbeedigitals.com'}/client-signup`
      })
      console.log('✅ HOS assessment received email sent to:', body.email)
    } catch (emailError) {
      console.error('Merchant confirmation email error:', emailError)
    }

    // 6. Send admin notification
    try {
      const { sendAdminGrowthAssessmentNotification } = await import('@/lib/emails/admin-growth-assessment-notification')
      await sendAdminGrowthAssessmentNotification(
        body.contact_name,
        body.business_name,
        body.email
      )
    } catch (emailError) {
      console.error('Admin notification email error:', emailError)
    }

    // 7. Create the admin notification via the trusted server-side helper.
    //    createNotification never throws; any failure is logged inside it.
    await createNotification({
      scope: 'admin',
      recipientId: null,
      type: 'assessment_submitted',
      title: 'New Assessment Submitted',
      message: `${body.business_name} has submitted a growth assessment.`,
      entityType: 'assessment',
      entityId: assessment.id,
      link: `/admin/growth-reviews/${review?.id || assessment.id}`,
    })

    // 8. Send review started email to merchant
    try {
      const { sendReviewStartedEmail } = await import('@/lib/emails/hos/review-started')
      await sendReviewStartedEmail({
        firstName: body.contact_name.split(' ')[0] || body.contact_name,
        email: body.email,
        portalUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hbeedigitals.com'}/client-portal`
      })
      console.log('✅ Review started email sent to:', body.email)
    } catch (emailError) {
      console.error('Review started email error:', emailError)
    }

    return NextResponse.json({
      success: true,
      data: {
        merchant_id: merchantId,
        assessment_id: assessment.id,
        review_id: review?.id || null,
        hgri_score: hgriScore,
        classification: classification,
        primary_constraint: primaryConstraint,
        recommended_focus: recommendedFocus,
        score_breakdown: {
          visibility: visibilityScore,
          conversion: conversionScore,
          retention: retentionScore,
          authority: authorityScore,
          scalability: scalabilityScore,
          total: hgriScore
        }
      }
    })

  } catch (error) {
    console.error('Assessment submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}