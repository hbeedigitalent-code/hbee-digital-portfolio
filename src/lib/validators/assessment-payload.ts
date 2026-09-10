// src/lib/validators/assessment-payload.ts
//
// SERVER-SIDE strict validation for the public growth assessment endpoint.
//
// src/lib/validators/assessment-validation.ts validates the same form in the
// browser to drive per-step errors. That file is a UX aid and is not a
// security control — the endpoint is public, so anything it accepts must be
// re-checked here against an explicit allow-list.
//
// The important property: this module REBUILDS the payload from known keys
// rather than filtering the request object. Any field the caller invents is
// dropped rather than carried along, so nothing unexpected can reach a database
// column or `raw_answers_json` — including the Turnstile token, which is
// consumed by the route and is not a field name below.

export interface ValidatedAssessment {
  business_name: string
  website: string
  contact_name: string
  email: string
  country: string
  industry: string
  business_stage: string
  store_age: string
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
  consent: true
}

export type ValidationOutcome =
  | { ok: true; value: ValidatedAssessment }
  | { ok: false; error: string }

/** Per-field maximum lengths. Free-text answers get more room than choices. */
const MAX_LENGTHS: Record<string, number> = {
  business_name: 200,
  website: 500,
  contact_name: 200,
  email: 320, // RFC 5321 maximum
  country: 100,
  industry: 120,
  business_stage: 120,
  store_age: 120,
  success_vision: 2000,
  best_channel: 120,
  paid_ads_usage: 120,
  email_capture: 120,
  email_automations: 120,
  customer_reviews: 120,
  content_publishing: 120,
  upsells_crosssells: 120,
  biggest_challenge: 2000,
  main_obstacle: 2000,
  support_type: 120,
  improvement_timeline: 120,
}

const REQUIRED_STRINGS = [
  'business_name',
  'website',
  'contact_name',
  'email',
  'country',
  'industry',
  'business_stage',
  'store_age',
  'success_vision',
  'best_channel',
  'paid_ads_usage',
  'email_capture',
  'email_automations',
  'customer_reviews',
  'content_publishing',
  'upsells_crosssells',
  'biggest_challenge',
  'main_obstacle',
  'support_type',
  'improvement_timeline',
] as const

const REQUIRED_ARRAYS = ['primary_goals', 'marketing_channels'] as const
const OPTIONAL_ARRAYS = ['paid_ad_platforms'] as const

const MAX_ARRAY_ITEMS = 25
const MAX_ARRAY_ITEM_LENGTH = 200

// Conservative but permissive enough for real addresses. Deliberately not an
// RFC-complete pattern — the confirmation email is the real proof of address.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

/**
 * Strips control characters and normalises whitespace. Tab and newline survive
 * so multi-line free-text answers stay readable; everything else in the C0/C1
 * control range is removed before the value can reach storage or an email.
 */
function clean(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function cleanArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  if (value.length > MAX_ARRAY_ITEMS) return null

  const out: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') return null
    const cleaned = clean(item)
    if (!cleaned) continue
    if (cleaned.length > MAX_ARRAY_ITEM_LENGTH) return null
    out.push(cleaned)
  }
  // De-duplicate; a repeated choice carries no extra meaning.
  return Array.from(new Set(out))
}

/**
 * Accepts a bare domain or an http/https URL. Any other scheme is rejected —
 * a `javascript:` or `data:` value would otherwise be stored and later rendered
 * as a link in the admin UI.
 */
function normaliseWebsite(raw: string): string | null {
  const value = clean(raw)
  if (!value) return null
  if (value.length > MAX_LENGTHS.website) return null

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`

  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

export function validateAssessmentPayload(input: Record<string, unknown>): ValidationOutcome {
  const out: Record<string, unknown> = {}

  for (const field of REQUIRED_STRINGS) {
    const raw = input[field]
    if (typeof raw !== 'string') {
      return { ok: false, error: `Missing or invalid field: ${field}` }
    }

    if (field === 'website') {
      const website = normaliseWebsite(raw)
      if (!website) {
        return { ok: false, error: 'Please enter a valid website address.' }
      }
      out.website = website
      continue
    }

    const value = clean(raw)
    if (!value) {
      return { ok: false, error: `Missing or invalid field: ${field}` }
    }
    if (value.length > (MAX_LENGTHS[field] ?? 500)) {
      return { ok: false, error: `The value for ${field} is too long.` }
    }

    if (field === 'email') {
      const email = value.toLowerCase()
      if (!EMAIL_RE.test(email)) {
        return { ok: false, error: 'Please enter a valid email address.' }
      }
      out.email = email
      continue
    }

    if (field === 'success_vision' && value.length < 10) {
      return { ok: false, error: 'Please describe your success vision in a little more detail.' }
    }

    out[field] = value
  }

  for (const field of REQUIRED_ARRAYS) {
    const arr = cleanArray(input[field])
    if (!arr || arr.length === 0) {
      return { ok: false, error: `Please make at least one selection for ${field}.` }
    }
    out[field] = arr
  }

  for (const field of OPTIONAL_ARRAYS) {
    if (input[field] === undefined || input[field] === null) {
      out[field] = []
      continue
    }
    const arr = cleanArray(input[field])
    if (!arr) {
      return { ok: false, error: `Invalid value for ${field}.` }
    }
    out[field] = arr
  }

  const confidence = Number(input.visibility_confidence)
  if (!Number.isFinite(confidence) || !Number.isInteger(confidence)) {
    return { ok: false, error: 'Please rate your visibility confidence.' }
  }
  if (confidence < 1 || confidence > 10) {
    return { ok: false, error: 'Visibility confidence must be between 1 and 10.' }
  }
  out.visibility_confidence = confidence

  // Consent must be an explicit boolean true — not "true", not 1.
  if (input.consent !== true) {
    return { ok: false, error: 'Consent is required.' }
  }
  out.consent = true

  return { ok: true, value: out as unknown as ValidatedAssessment }
}
