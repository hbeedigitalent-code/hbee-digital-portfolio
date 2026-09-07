// src/lib/services/merchant-lifecycle.ts

import { createClientComponentClient } from '@/lib/supabase-client'
import { 
  MerchantStatus, 
  MerchantStatusRecord, 
  GrowthReview, 
  GrowthReviewStatus,
  Notification,
  NotificationType,
  MerchantLifecycleMetrics 
} from '@/types/merchant-lifecycle'

export class MerchantLifecycleService {
  private static supabase = createClientComponentClient()

  /**
   * Get or create merchant status record
   */
  static async getOrCreateMerchantStatus(merchantId: string): Promise<MerchantStatusRecord | null> {
    const { data: existing, error: fetchError } = await this.supabase
      .from('merchant_status')
      .select('*')
      .eq('merchant_id', merchantId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching merchant status:', fetchError)
      return null
    }

    if (existing) {
      return existing as MerchantStatusRecord
    }

    const { data: created, error: createError } = await this.supabase
      .from('merchant_status')
      .insert({
        merchant_id: merchantId,
        status: 'lead',
        last_activity: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating merchant status:', createError)
      return null
    }

    return created as MerchantStatusRecord
  }

  /**
   * Update merchant status
   */
  static async updateStatus(
    merchantId: string, 
    status: MerchantStatus,
    stage?: string
  ): Promise<MerchantStatusRecord | null> {
    const { data, error } = await this.supabase
      .from('merchant_status')
      .update({
        status,
        current_stage: stage || status,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('merchant_id', merchantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating merchant status:', error)
      return null
    }

    return data as MerchantStatusRecord
  }

  /**
   * Get merchant status by ID
   */
  static async getMerchantStatus(merchantId: string): Promise<MerchantStatusRecord | null> {
    const { data, error } = await this.supabase
      .from('merchant_status')
      .select('*')
      .eq('merchant_id', merchantId)
      .single()

    if (error) {
      console.error('Error fetching merchant status:', error)
      return null
    }

    return data as MerchantStatusRecord
  }

  /**
   * Get all merchants by status
   */
  static async getMerchantsByStatus(status: MerchantStatus): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('merchant_status')
      .select(`
        *,
        merchant:merchants(*)
      `)
      .eq('status', status)
      .order('last_activity', { ascending: false })

    if (error) {
      console.error('Error fetching merchants by status:', error)
      return []
    }

    return data
  }

  /**
   * Get lifecycle metrics
   */
  static async getLifecycleMetrics(): Promise<MerchantLifecycleMetrics> {
    const { data, error } = await this.supabase
      .from('merchant_status')
      .select('status')

    if (error) {
      console.error('Error fetching lifecycle metrics:', error)
      return {
        totalMerchants: 0,
        lead: 0,
        assessmentSubmitted: 0,
        reviewInProgress: 0,
        growthProfileReady: 0,
        proposalReady: 0,
        proposalSent: 0,
        proposalAccepted: 0,
        onboardingStarted: 0,
        activeClient: 0,
        projectActive: 0,
        projectCompleted: 0,
        retained: 0
      }
    }

    const counts: Record<string, number> = {}
    data?.forEach((item) => {
      counts[item.status] = (counts[item.status] || 0) + 1
    })

    return {
      totalMerchants: data?.length || 0,
      lead: counts.lead || 0,
      assessmentSubmitted: counts.assessment_submitted || 0,
      reviewInProgress: counts.review_in_progress || 0,
      growthProfileReady: counts.growth_profile_ready || 0,
      proposalReady: counts.proposal_ready || 0,
      proposalSent: counts.proposal_sent || 0,
      proposalAccepted: counts.proposal_accepted || 0,
      onboardingStarted: counts.onboarding_started || 0,
      activeClient: counts.active_client || 0,
      projectActive: counts.project_active || 0,
      projectCompleted: counts.project_completed || 0,
      retained: counts.retained || 0
    }
  }

  /**
   * Create a growth review
   */
  static async createGrowthReview(data: {
    merchant_id: string
    assessment_id?: string
    reviewer_id?: string
    review_notes?: string
  }): Promise<GrowthReview | null> {
    const { data: review, error } = await this.supabase
      .from('growth_reviews')
      .insert({
        ...data,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating growth review:', error)
      return null
    }

    await this.updateStatus(data.merchant_id, 'review_in_progress')

    // Batch N1c: the "New Review Started" admin notification used to be written
    // here with user_id: 'admin', which the uuid column always rejected with
    // 22P02 — it never persisted. This method is itself dead (no call sites).
    // Admin notifications are now created only by trusted server-side code; if
    // this path ever gains a real caller it must POST to an authenticated
    // admin route instead.

    return review as GrowthReview
  }

  /**
   * Update growth review
   */
  static async updateGrowthReview(
    reviewId: string,
    data: Partial<GrowthReview>
  ): Promise<GrowthReview | null> {
    const { data: review, error } = await this.supabase
      .from('growth_reviews')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single()

    if (error) {
      console.error('Error updating growth review:', error)
      return null
    }

    return review as GrowthReview
  }

  /**
   * Complete growth review and generate growth profile (ENHANCED)
   */
  static async completeGrowthReview(
    reviewId: string,
    data: {
      hgri_score: number
      growth_classification: string
      strengths: string[]
      opportunities: string[]
      recommendations: any
      review_notes?: string
      visibility_score?: number
      conversion_score?: number
      retention_score?: number
      authority_score?: number
      scalability_score?: number
    }
  ): Promise<GrowthReview | null> {
    try {
      // Get the review with assessment and merchant
      const { data: review, error: reviewError } = await this.supabase
        .from('growth_reviews')
        .select(`
          *,
          merchant:merchants(*),
          assessment:growth_assessments(*)
        `)
        .eq('id', reviewId)
        .single()

      if (reviewError || !review) {
        console.error('Error fetching review:', reviewError)
        return null
      }

      // Update review status
      const { data: updatedReview, error: updateError } = await this.supabase
        .from('growth_reviews')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          review_notes: data.review_notes || review.review_notes,
          hgri_score: data.hgri_score,
          growth_classification: data.growth_classification,
          strengths: data.strengths,
          opportunities: data.opportunities,
          recommendations: data.recommendations,
          visibility_score: data.visibility_score || 0,
          conversion_score: data.conversion_score || 0,
          retention_score: data.retention_score || 0,
          authority_score: data.authority_score || 0,
          scalability_score: data.scalability_score || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating review:', updateError)
        return null
      }

      // Update assessment
      if (review.assessment) {
        await this.supabase
          .from('growth_assessments')
          .update({
            review_status: 'approved',
            hgri_score: data.hgri_score,
            growth_classification: data.growth_classification,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', review.assessment.id)
      }

      // Generate growth profile using the GrowthProfileService
      const { GrowthProfileService } = await import('./growth-profile-service')
      const profile = await GrowthProfileService.generateFromAssessment(
        review.assessment_id,
        {
          review_notes: data.review_notes,
          hgri_score: data.hgri_score,
          growth_classification: data.growth_classification,
          strengths: data.strengths,
          opportunities: data.opportunities,
          visibility_score: data.visibility_score || 0,
          conversion_score: data.conversion_score || 0,
          retention_score: data.retention_score || 0,
          authority_score: data.authority_score || 0,
          scalability_score: data.scalability_score || 0,
          recommendations: data.recommendations
        },
        review.reviewer_id || 'admin'
      )

      if (profile) {
        // Update merchant status (already handled in generateFromAssessment)
        // Create notification for merchant (already handled in generateFromAssessment)
        console.log('✅ Growth profile generated:', profile.id)
      } else {
        console.warn('⚠️ Profile generation failed, but review completed')
      }

      return updatedReview as GrowthReview
    } catch (error) {
      console.error('Error completing growth review:', error)
      return null
    }
  }

  /**
   * Get growth review by ID
   */
  static async getGrowthReview(reviewId: string): Promise<GrowthReview | null> {
    const { data, error } = await this.supabase
      .from('growth_reviews')
      .select(`
        *,
        merchant:merchants(*),
        assessment:growth_assessments(*)
      `)
      .eq('id', reviewId)
      .single()

    if (error) {
      console.error('Error fetching growth review:', error)
      return null
    }

    return data as GrowthReview
  }

  /**
   * Get growth reviews by merchant
   */
  static async getGrowthReviewsByMerchant(merchantId: string): Promise<GrowthReview[]> {
    const { data, error } = await this.supabase
      .from('growth_reviews')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching growth reviews:', error)
      return []
    }

    return data as GrowthReview[]
  }

  /**
   * Get pending growth reviews
   */
  static async getPendingGrowthReviews(): Promise<GrowthReview[]> {
    const { data, error } = await this.supabase
      .from('growth_reviews')
      .select(`
        *,
        merchant:merchants(*)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching pending growth reviews:', error)
      return []
    }

    return data as GrowthReview[]
  }

  /**
   * @deprecated Batch N1c removed the browser-side notification write.
   *
   * This module is imported by 'use client' pages, so it can never reach
   * src/lib/notifications/createNotification.ts (which builds a service-role
   * client). Rows written here omitted every N0 column — recipient_scope,
   * recipient_id, entity_type, entity_id and idempotency_key — so they were
   * invisible to any recipient-scoped feed and could not be deduplicated.
   *
   * Notifications are now created exclusively by trusted server-side code:
   * POST /api/admin/growth-profiles, POST /api/admin/proposals, and the two
   * N1 API routes. Each authenticates the caller, verifies active-admin
   * status, resolves the recipient server-side, and writes the full N0 column
   * set.
   *
   * The signature is kept so existing callers still compile. It performs no
   * database write and always returns null; any remaining caller must be moved
   * behind an authenticated server route.
   */
  static async createNotification(data: {
    user_id: string
    user_type: 'admin' | 'merchant' | 'client'
    type: NotificationType
    title: string
    message: string
    link?: string
  }): Promise<Notification | null> {
    console.warn(
      `[MerchantLifecycleService.createNotification] deprecated no-op: "${data.type}" notifications must be created by an authenticated server route`
    )
    return null
  }

  /**
   * Get notifications for user
   */
  static async getNotifications(
    userId: string,
    userType: 'admin' | 'merchant' | 'client',
    limit: number = 50
  ): Promise<Notification[]> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('user_type', userType)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }

    return data as Notification[]
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) {
      console.error('Error marking notification as read:', error)
      return false
    }

    return true
  }

  /**
   * Mark all notifications as read for user
   */
  static async markAllNotificationsAsRead(
    userId: string,
    userType: 'admin' | 'merchant' | 'client'
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('user_type', userType)
      .eq('read', false)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }

    return true
  }

  /**
   * Get unread notification count
   */
  static async getUnreadNotificationCount(
    userId: string,
    userType: 'admin' | 'merchant' | 'client'
  ): Promise<number> {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('user_type', userType)
      .eq('read', false)

    if (error) {
      console.error('Error fetching unread notification count:', error)
      return 0
    }

    return count || 0
  }
}