// src/components/assessment/AssessmentForm.tsx

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StepIndicator } from './StepIndicator'
import { Step1BusinessProfile } from './Step1BusinessProfile'
import { Step2BusinessStage } from './Step2BusinessStage'
import { Step3GrowthObjectives } from './Step3GrowthObjectives'
import { Step4VisibilityMarketing } from './Step4VisibilityMarketing'
import { Step5CustomerExperience } from './Step5CustomerExperience'
import { Step6GrowthChallenges } from './Step6GrowthChallenges'
import { Step7GrowthReadiness } from './Step7GrowthReadiness'
import { useAssessmentForm } from '@/hooks/useAssessmentForm'
import SvgIcon from '@/components/ui/SvgIcon'
import TurnstileWidget from '@/components/ui/TurnstileWidget'
import { motion, AnimatePresence } from 'framer-motion'

const stepComponents = {
  1: Step1BusinessProfile,
  2: Step2BusinessStage,
  3: Step3GrowthObjectives,
  4: Step4VisibilityMarketing,
  5: Step5CustomerExperience,
  6: Step6GrowthChallenges,
  7: Step7GrowthReadiness
}

const stepTitles = {
  1: 'Business Profile',
  2: 'Business Stage', 
  3: 'Growth Objectives',
  4: 'Visibility & Marketing',
  5: 'Customer Experience',
  6: 'Growth Challenges',
  7: 'Growth Readiness'
}

const stepSubtext = {
  1: 'Tell us about your business',
  2: 'Help us understand where you are in your journey',
  3: 'Select your top 3 goals for the next 90 days',
  4: 'How do customers discover your business?',
  5: 'How do you engage with your customers?',
  6: 'Help us understand what\'s holding you back',
  7: 'Tell us about your readiness to grow'
}

const containerVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
}

export function AssessmentForm() {
  const router = useRouter()
  
  const {
    currentStep,
    formData,
    errors,
    isSubmitting,
    isSubmitted,
    updateField,
    nextStep,
    prevStep,
    submitForm,
    isCurrentStepComplete,
    turnstileToken,
    setTurnstileToken,
    turnstileReset,
    resetTurnstile
  } = useAssessmentForm()

  // Redirect to thank you page after successful submission
  if (isSubmitted) {
    router.push('/assessment/thank-you')
    return null
  }

  const StepComponent = stepComponents[currentStep as keyof typeof stepComponents]
  const currentTitle = stepTitles[currentStep as keyof typeof stepTitles]
  const currentSubtext = stepSubtext[currentStep as keyof typeof stepSubtext]

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8 shadow-[var(--shadow-lg)]">
      {/* Progress Indicator */}
      <StepIndicator
        currentStep={currentStep}
        totalSteps={7}
      />

      {/* Current Step Title - Smooth transition */}
      <motion.div
        key={`title-${currentStep}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
          {currentTitle}
        </h2>
        <p className="mt-1 text-[var(--text-muted)]">
          {currentSubtext}
        </p>
      </motion.div>

      {/* Step Content with Smooth Transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <StepComponent
            formData={formData}
            updateField={updateField}
            errors={errors}
          />
        </motion.div>
      </AnimatePresence>

      {/* Error Messages */}
      <AnimatePresence>
        {errors.submit && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-500 text-sm"
          >
            {errors.submit}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security check — rendered only on the final step, immediately above
          the submit button. The server verifies the token before any database
          write or email, so this is the visible half of a real control rather
          than decoration. */}
      {currentStep === 7 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <TurnstileWidget
            onVerify={setTurnstileToken}
            onExpire={resetTurnstile}
            onError={resetTurnstile}
            reset={turnstileReset}
          />
          <p className="text-xs text-[var(--text-muted)]">
            This quick check helps us keep automated submissions out.
          </p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between gap-4 border-t border-[var(--border)] pt-6">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--bg-section)] hover:border-[var(--accent)]/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <SvgIcon name="chevron-left" size={16} color="var(--text-primary)" />
          Previous
        </button>

        {currentStep === 7 ? (
          <button
            type="button"
            onClick={submitForm}
            disabled={isSubmitting || !isCurrentStepComplete() || !turnstileToken}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-orange)] px-8 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-[var(--accent-orange)]/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Submitting...
              </>
            ) : (
              <>
                Submit For Review
                <SvgIcon name="check" size={18} color="white" />
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={nextStep}
            disabled={!isCurrentStepComplete()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-orange)] px-8 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-[var(--accent-orange)]/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <SvgIcon name="chevron-right" size={16} color="white" />
          </button>
        )}
      </div>
    </div>
  )
}