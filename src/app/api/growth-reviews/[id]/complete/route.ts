// src/app/api/growth-reviews/[id]/complete/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  createNotification,
  resolveClientIdByMerchantId,
} from '@/lib/notifications/createNotification'

// Use environment variables safely
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Use the anon key instead of service role key to avoid build issues
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Only create the client if we have the required keys
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // If Supabase client is not initialized, return error
  if (!supabase) {
    console.error('Supabase client not initialized')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const { id } = params

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
      merchant_id,
      assessment_id
    } = body

    // Validate required fields
    if (!merchant_id || !assessment_id) {
      return NextResponse.json(
        { error: 'Missing merchant_id or assessment_id' },
        { status: 400 }
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
        { error: 'Failed to create growth profile: ' + profileError.message },
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
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
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