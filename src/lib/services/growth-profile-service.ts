// src/lib/services/growth-profile-service.ts

import { createClientComponentClient } from '@/lib/supabase-client'
import { GrowthProfile } from '@/types/growth-readiness'
import { MerchantLifecycleService } from './merchant-lifecycle'

export class GrowthProfileService {
  private static supabase = createClientComponentClient()

  /**
   * Get growth profile by merchant ID
   */
  static async getProfileByMerchant(merchantId: string): Promise<GrowthProfile | null> {
    const { data, error } = await this.supabase
      .from('growth_profiles')
      .select(`
        *,
        merchant:merchants(*),
        assessment:growth_assessments(*)
      `)
      .eq('merchant_id', merchantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found - this is expected
        return null
      }
      console.error('Error fetching growth profile:', error)
      return null
    }

    return data as GrowthProfile
  }

  /**
   * Get growth profile by ID
   */
  static async getProfileById(profileId: string): Promise<GrowthProfile | null> {
    const { data, error } = await this.supabase
      .from('growth_profiles')
      .select(`
        *,
        merchant:merchants(*),
        assessment:growth_assessments(*)
      `)
      .eq('id', profileId)
      .single()

    if (error) {
      console.error('Error fetching growth profile:', error)
      return null
    }

    return data as GrowthProfile
  }

  /**
   * Generate growth profile from assessment (NEW - Enhanced)
   * This is called when an admin completes a review
   */
  static async generateFromAssessment(
    assessmentId: string,
    reviewData: {
      review_notes?: string
      hgri_score: number
      growth_classification: string
      strengths: string[]
      opportunities: string[]
      visibility_score: number
      conversion_score: number
      retention_score: number
      authority_score: number
      scalability_score: number
      recommendations?: string[]
    },
    adminUserId: string
  ): Promise<GrowthProfile | null> {
    try {
      // Get assessment with merchant
      const { data: assessment, error: assessmentError } = await this.supabase
        .from('growth_assessments')
        .select(`
          *,
          merchant:merchants(*)
        `)
        .eq('id', assessmentId)
        .single()

      if (assessmentError || !assessment) {
        console.error('Error fetching assessment:', assessmentError)
        return null
      }

      // Generate profile data
      const profileData = {
        scores: {
          pillars: {
            visibility: reviewData.visibility_score || assessment.visibility_score || 0,
            conversion: reviewData.conversion_score || assessment.conversion_score || 0,
            retention: reviewData.retention_score || assessment.retention_score || 0,
            authority: reviewData.authority_score || assessment.authority_score || 0,
            scalability: reviewData.scalability_score || assessment.scalability_score || 0
          },
          hgri: reviewData.hgri_score || assessment.hgri_score || 0
        },
        assessment: {
          id: assessment.id,
          submitted_at: assessment.created_at,
          primary_goals: assessment.primary_goals || [],
          business_stage: assessment.merchant?.business_stage || '',
          industry: assessment.merchant?.industry || ''
        },
        recommendations: reviewData.recommendations || this.generateRecommendations(reviewData)
      }

      // Create the profile
      const { data: profile, error: profileError } = await this.supabase
        .from('growth_profiles')
        .insert({
          merchant_id: assessment.merchant_id,
          assessment_id: assessmentId,
          title: `${assessment.merchant?.business_name || 'Business'} - Growth Profile`,
          summary: this.generateSummary(assessment.merchant?.business_name, reviewData.growth_classification),
          hgri_score: reviewData.hgri_score || assessment.hgri_score || 0,
          growth_classification: reviewData.growth_classification || assessment.classification || 'Growth Potential',
          profile_data: profileData,
          is_active: true,
          created_by: adminUserId,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (profileError) {
        console.error('Error creating growth profile:', profileError)
        return null
      }

      // Update merchant status
      await MerchantLifecycleService.updateStatus(assessment.merchant_id, 'growth_profile_ready')

      // Update client record
      await this.updateClientGrowthProfile(
        assessment.merchant_id,
        profile.id,
        profile.hgri_score,
        profile.growth_classification
      )

      // Create notification for merchant
      await MerchantLifecycleService.createNotification({
        user_id: assessment.merchant_id,
        user_type: 'merchant',
        type: 'growth_profile_ready',
        title: 'Growth Profile Ready',
        message: `Your Growth Profile is ready! You have been classified as ${profile.growth_classification}.`,
        link: '/client-portal/growth-profile'
      })

      return profile as GrowthProfile
    } catch (error) {
      console.error('Error generating growth profile:', error)
      return null
    }
  }

  /**
   * Create growth profile from assessment (Existing method - kept for compatibility)
   *
   * Batch N1c: this is now a thin client of POST /api/admin/growth-profiles.
   * That route authenticates the caller, verifies 2FA and active-admin status,
   * derives merchant_id from the stored assessment, performs the profile
   * insert plus the merchant-status and client-record updates, and creates the
   * "growth profile ready" notification with the trusted server-side writer.
   * This module is imported by 'use client' pages, so it must never import
   * createNotification.ts, a service-role client, or read
   * SUPABASE_SERVICE_ROLE_KEY.
   *
   * The signature and `GrowthProfile | null` return shape are unchanged so
   * existing callers keep working. `adminUserId` is accepted for compatibility
   * but intentionally ignored — the route uses the authenticated session user
   * for `created_by`, which also fixes the old failure where a null
   * reviewer_id sent an empty string into a uuid column.
   */
  static async createFromAssessment(
    assessmentId: string,
    adminUserId: string,
    data: {
      title: string
      summary: string
      hgri_score: number
      growth_classification: string
      profile_data?: any
      pdf_url?: string
    }
  ): Promise<GrowthProfile | null> {
    try {
      const response = await fetch('/api/admin/growth-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          assessment_id: assessmentId,
          title: data.title,
          summary: data.summary,
          hgri_score: data.hgri_score,
          growth_classification: data.growth_classification,
          profile_data: data.profile_data || {},
          pdf_url: data.pdf_url || null
        })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.profile) {
        console.error(
          'Error creating growth profile:',
          payload?.error || `Request failed with status ${response.status}`
        )
        return null
      }

      return payload.profile as GrowthProfile
    } catch (error) {
      console.error('Error creating growth profile:', error)
      return null
    }
  }

  /**
   * Update client record with growth profile info
   *
   * Retained only for generateFromAssessment(), which is transitively dead
   * (its sole caller, MerchantLifecycleService.completeGrowthReview(), has no
   * call sites) and is deliberately left unchanged in this batch. The live
   * path, createFromAssessment(), no longer uses this — POST
   * /api/admin/growth-profiles performs the clients update server-side.
   */
  private static async updateClientGrowthProfile(
    merchantId: string,
    profileId: string,
    hgriScore: number,
    classification: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('clients')
      .update({
        growth_profile_id: profileId,
        hgri_score: hgriScore,
        growth_classification: classification
      })
      .eq('merchant_id', merchantId)

    if (error) {
      console.error('Error updating client growth profile:', error)
    }
  }

  /**
   * Check if merchant has a growth profile
   */
  static async hasProfile(merchantId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('growth_profiles')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking growth profile:', error)
    }

    return !!data
  }

  /**
   * Get profile download URL
   */
  static async getProfilePDFUrl(profileId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('growth_profile_pdfs')
      .select('file_url')
      .eq('growth_profile_id', profileId)
      .eq('is_latest', true)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching PDF URL:', error)
      return null
    }

    return data?.file_url || null
  }

  /**
   * Generate summary from business name and classification
   */
  private static generateSummary(businessName: string | undefined, classification: string): string {
    const name = businessName || 'The business'
    const summaries: Record<string, string> = {
      'Foundation': `${name} is in the Foundation stage. The business has established core operations but has significant growth opportunities ahead. Focus on building visibility and conversion systems.`,
      'Foundation Stage': `${name} is in the Foundation stage. The business has established core operations but has significant growth opportunities ahead. Focus on building visibility and conversion systems.`,
      'Growth Potential': `${name} shows strong Growth Potential. The business has solid fundamentals and is ready to scale with the right strategies in place.`,
      'Growth Ready': `${name} is Growth Ready. The business has proven systems, strong customer engagement, and is positioned for significant expansion.`,
      'Scale Ready': `${name} is Scale Ready. The business demonstrates exceptional operational maturity, brand authority, and is prepared for rapid scaling.`
    }
    return summaries[classification] || `${name} shows promising growth characteristics.`
  }

  /**
   * Generate recommendations from review data
   */
  private static generateRecommendations(data: any): string[] {
    const recommendations: string[] = []
    
    if (data.visibility_score !== undefined && data.visibility_score < 50) {
      recommendations.push('Implement a comprehensive SEO strategy to improve organic visibility')
      recommendations.push('Leverage content marketing to build brand awareness')
    }
    if (data.conversion_score !== undefined && data.conversion_score < 50) {
      recommendations.push('Optimize website user experience and conversion funnel')
      recommendations.push('Implement A/B testing to improve conversion rates')
    }
    if (data.retention_score !== undefined && data.retention_score < 50) {
      recommendations.push('Build an email marketing automation system')
      recommendations.push('Implement customer loyalty and retention programs')
    }
    if (data.authority_score !== undefined && data.authority_score < 50) {
      recommendations.push('Develop a content strategy to build industry authority')
      recommendations.push('Leverage social proof and customer testimonials')
    }
    if (data.scalability_score !== undefined && data.scalability_score < 50) {
      recommendations.push('Build scalable systems and processes for growth')
      recommendations.push('Implement automation tools to reduce manual work')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Continue optimizing current growth strategies')
      recommendations.push('Explore new channels for customer acquisition')
    }
    
    return recommendations
  }
}