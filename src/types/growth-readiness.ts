// src/types/growth-readiness.ts

export interface Merchant {
  id: string
  business_name: string
  website: string
  contact_name: string
  email: string
  country: string
  industry: string
  business_stage: string
  store_age: string
  created_at: string
}

export interface GrowthAssessment {
  id: string
  merchant_id: string
  primary_goals: string[]
  success_vision: string
  marketing_channels: string[]
  best_channel: string
  paid_ads_usage: string
  paid_ad_platforms: string[]
  visibility_confidence: number
  email_capture: string
  email_automations: string
  customer_reviews: string
  content_publishing: string
  upsells_crosssells: string
  biggest_challenge: string
  main_obstacle: string
  support_type: string
  improvement_timeline: string
  visibility_score: number
  conversion_score: number
  retention_score: number
  authority_score: number
  scalability_score: number
  hgri_score: number
  classification: string
  primary_constraint: string
  recommended_focus: string
  raw_answers_json: any
  uploaded_file_url: string | null
  status: string
  created_at: string
}

export interface GrowthProfile {
  id: string
  merchant_id: string
  assessment_id: string
  profile_summary: string
  growth_classification: string
  recommended_focus: string
  top_opportunities: string[]
  primary_constraint: string
  status: string
  created_at: string
}

export interface OpportunityReview {
  id: string
  merchant_id: string
  assessment_id: string
  review_status: string
  review_document_url: string | null
  internal_notes: string | null
  created_at: string
}

export interface GrowthSupportRequest {
  id: string
  merchant_id: string
  support_type: string
  status: string
  notes: string | null
  created_at: string
}

export interface FormData {
  // Step 1: Business Profile
  business_name: string
  website: string
  contact_name: string
  email: string
  country: string
  industry: string
  
  // Step 2: Business Stage
  business_stage: string
  store_age: string
  
  // Step 3: Growth Objectives
  primary_goals: string[]
  success_vision: string
  
  // Step 4: Visibility & Marketing
  marketing_channels: string[]
  best_channel: string
  paid_ads_usage: string
  paid_ad_platforms: string[]
  visibility_confidence: number
  
  // Step 5: Customer Experience
  email_capture: string
  email_automations: string
  customer_reviews: string
  content_publishing: string
  upsells_crosssells: string
  
  // Step 6: Growth Challenges
  biggest_challenge: string
  main_obstacle: string
  
  // Step 7: Growth Readiness
  // `uploaded_file` was removed: the assessment submits as JSON, which cannot
  // carry a File, so the value never left the browser. The database column
  // GrowthAssessment.uploaded_file_url above is untouched — it belongs to the
  // stored row, not to this form payload.
  support_type: string
  improvement_timeline: string
  consent: boolean
}

export interface ScoreBreakdown {
  visibility: number
  conversion: number
  retention: number
  authority: number
  scalability: number
  total: number
  classification: string
}

export type ClassificationType = 'Foundation Stage' | 'Growth Potential' | 'Growth Ready' | 'Scale Ready'
export type StatusType = 'New Submission' | 'Under Review' | 'Growth Profile Issued' | 'Opportunity Review Candidate' | 'Opportunity Review Sent' | 'Growth Support Eligible' | 'Growth Partner' | 'Client' | 'Archived'

// Form step types
export type FormStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface StepConfig {
  id: FormStep
  title: string
  subtitle?: string
  fields: string[]
}