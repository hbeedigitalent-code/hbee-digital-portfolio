// src/components/assessment/Step7GrowthReadiness.tsx
'use client'

import { FormData } from '@/types/growth-readiness'

interface Step7GrowthReadinessProps {
  formData: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  errors: Record<string, string>
}

const supportTypes = [
  { value: 'Just exploring', label: 'Just exploring', description: 'Learning about growth opportunities' },
  { value: 'Looking for guidance', label: 'Looking for guidance', description: 'Need direction and advice' },
  { value: 'Looking for strategy', label: 'Looking for strategy', description: 'Need strategic planning' },
  { value: 'Looking for implementation support', label: 'Looking for implementation', description: 'Need hands-on execution' }
]

const timelines = [
  'Immediately',
  '30 days',
  '60 days',
  '90 days',
  'Just exploring'
]

export function Step7GrowthReadiness({ formData, updateField, errors }: Step7GrowthReadinessProps) {
  // The "Upload Supporting Documents" control that used to sit between the
  // timeline question and the consent box has been removed. It was never
  // functional: the File object was held in React state, and submission sends
  // JSON.stringify(formData), which serialises a File to `{}`. The merchant saw
  // their filename echoed back and the file was silently discarded — no request
  // field, no storage bucket, no database column was ever written. Removed
  // rather than repaired; a real upload path is separate work.
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-3 block text-sm font-medium text-[var(--text-primary)]">
          What type of support are you looking for? <span className="text-red-500">*</span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {supportTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => updateField('support_type', type.value)}
              className={`rounded-lg border p-4 text-left transition-all ${
                formData.support_type === type.value
                  ? 'border-[var(--accent-orange)] bg-[var(--accent-orange)]/10 ring-2 ring-[var(--accent-orange)]'
                  : 'border-[var(--border)] bg-[var(--bg-page)] hover:border-[var(--accent-orange)]'
              }`}
            >
              <div className="font-medium text-[var(--text-primary)]">{type.label}</div>
              <div className="text-sm text-[var(--text-muted)]">{type.description}</div>
            </button>
          ))}
        </div>
        {errors.support_type && (
          <p className="mt-2 text-sm text-red-500">{errors.support_type}</p>
        )}
      </div>

      <div>
        <label htmlFor="improvement_timeline" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          When are you looking to make improvements? <span className="text-red-500">*</span>
        </label>
        <select
          id="improvement_timeline"
          value={formData.improvement_timeline}
          onChange={(e) => updateField('improvement_timeline', e.target.value)}
          className={`w-full rounded-lg border bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 ${
            errors.improvement_timeline ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-[var(--accent-orange)]'
          }`}
        >
          <option value="">Select timeline...</option>
          {timelines.map((timeline) => (
            <option key={timeline} value={timeline}>{timeline}</option>
          ))}
        </select>
        {errors.improvement_timeline && (
          <p className="mt-1 text-sm text-red-500">{errors.improvement_timeline}</p>
        )}
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.consent}
            onChange={(e) => updateField('consent', e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-[var(--border)] bg-[var(--bg-page)] text-[var(--accent-orange)] focus:ring-[var(--accent-orange)]"
          />
          <span className="text-sm text-[var(--text-muted)]">
            I consent to Hbee Digitals processing my data to generate my growth profile 
            and for potential partnership opportunities. I understand my data will be 
            kept secure and private.
            <span className="text-red-500"> *</span>
          </span>
        </label>
        {errors.consent && (
          <p className="mt-2 text-sm text-red-500">{errors.consent}</p>
        )}
      </div>
    </div>
  )
}