'use client'

import { useState, useCallback, useEffect } from 'react'
import { FormData, FormStep } from '@/types/growth-readiness'
import { validateStep, isStepComplete } from '@/lib/validators/assessment-validation'

const initialFormData: FormData = {
  // Step 1: Business Profile
  business_name: '',
  website: '',
  contact_name: '',
  email: '',
  country: '',
  industry: '',
  
  // Step 2: Business Stage
  business_stage: '',
  store_age: '',
  
  // Step 3: Growth Objectives
  primary_goals: [],
  success_vision: '',
  
  // Step 4: Visibility & Marketing
  marketing_channels: [],
  best_channel: '',
  paid_ads_usage: '',
  paid_ad_platforms: [],
  visibility_confidence: 5,
  
  // Step 5: Customer Experience
  email_capture: '',
  email_automations: '',
  customer_reviews: '',
  content_publishing: '',
  upsells_crosssells: '',
  
  // Step 6: Growth Challenges
  biggest_challenge: '',
  main_obstacle: '',
  
  // Step 7: Growth Readiness
  support_type: '',
  improvement_timeline: '',
  consent: false
}

export function useAssessmentForm() {
  const [currentStep, setCurrentStep] = useState<FormStep>(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Turnstile state is kept OUT of formData on purpose. formData is persisted to
  // localStorage as a draft, and a challenge token is short-lived and
  // single-use — restoring a stale one from storage would fail verification and
  // look like a broken form. `turnstileReset` is a toggle the widget watches so
  // a failed submission can force a fresh challenge.
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileReset, setTurnstileReset] = useState(false)

  const resetTurnstile = useCallback(() => {
    setTurnstileToken(null)
    setTurnstileReset((v) => !v)
  }, [])

  // Load saved data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('growth_assessment_draft')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setFormData(prev => ({ ...prev, ...parsed }))
      } catch (e) {
        console.error('Failed to load saved form data:', e)
      }
    }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    if (formData.business_name || formData.email) {
      localStorage.setItem('growth_assessment_draft', JSON.stringify(formData))
    }
  }, [formData])

  const updateField = useCallback(<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field as string]
        return newErrors
      })
    }
  }, [errors])

  const goToStep = useCallback((step: FormStep) => {
    // Validate current step before proceeding
    if (step > currentStep) {
      const stepErrors = validateStep(currentStep, formData)
      if (stepErrors.length > 0) {
        const errorMap: Record<string, string> = {}
        stepErrors.forEach(err => {
          errorMap[err.field] = err.message
        })
        setErrors(errorMap)
        return false
      }
    }
    setCurrentStep(step)
    setErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return true
  }, [currentStep, formData])

  const nextStep = useCallback(() => {
    if (currentStep < 7) {
      return goToStep((currentStep + 1) as FormStep)
    }
    return true
  }, [currentStep, goToStep])

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as FormStep)
      setErrors({})
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep])

  const validateCurrentStep = useCallback(() => {
    const stepErrors = validateStep(currentStep, formData)
    if (stepErrors.length > 0) {
      const errorMap: Record<string, string> = {}
      stepErrors.forEach(err => {
        errorMap[err.field] = err.message
      })
      setErrors(errorMap)
      return false
    }
    setErrors({})
    return true
  }, [currentStep, formData])

  const isCurrentStepComplete = useCallback(() => {
    return isStepComplete(currentStep, formData)
  }, [currentStep, formData])

  const resetForm = useCallback(() => {
    setFormData(initialFormData)
    setCurrentStep(1)
    setErrors({})
    localStorage.removeItem('growth_assessment_draft')
  }, [])

  const submitForm = useCallback(async () => {
    // Validate all steps before submission
    for (let step = 1; step <= 7; step++) {
      const stepErrors = validateStep(step as FormStep, formData)
      if (stepErrors.length > 0) {
        setCurrentStep(step as FormStep)
        const errorMap: Record<string, string> = {}
        stepErrors.forEach(err => {
          errorMap[err.field] = err.message
        })
        setErrors(errorMap)
        return false
      }
    }

    // The server verifies the token; this only avoids a pointless round trip.
    if (!turnstileToken) {
      setErrors({ submit: 'Please complete the security check before submitting.' })
      return false
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/growth-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // The token travels alongside the answers but is not part of formData,
        // so it is never written to the localStorage draft.
        body: JSON.stringify({ ...formData, turnstile_token: turnstileToken }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        // A used or expired token can never be replayed, so any failed attempt
        // discards it and asks the widget for a fresh challenge.
        resetTurnstile()
        setErrors({
          submit: result?.error || 'Failed to submit assessment',
        })
        return false
      }

      setIsSubmitted(true)
      localStorage.removeItem('growth_assessment_draft')
      return true
    } catch (error) {
      console.error('Submission error:', error)
      resetTurnstile()
      setErrors({ submit: 'Failed to submit assessment. Please try again.' })
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, turnstileToken, resetTurnstile])

  return {
    currentStep,
    formData,
    errors,
    isSubmitting,
    isSubmitted,
    updateField,
    goToStep,
    nextStep,
    prevStep,
    validateCurrentStep,
    isCurrentStepComplete,
    resetForm,
    submitForm,
    turnstileToken,
    setTurnstileToken,
    turnstileReset,
    resetTurnstile
  }
}