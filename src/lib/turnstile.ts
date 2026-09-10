// src/lib/turnstile.ts
//
// Server-side Cloudflare Turnstile verification.
//
// The widget at src/components/ui/TurnstileWidget.tsx has existed for some time
// but was rendered by no page, and TURNSTILE_SECRET_KEY was set in the
// environment but referenced by no code — so the challenge was never verified
// anywhere. This module is the missing server half.
//
// It is deliberately fail-closed: a missing secret, a missing token, a network
// failure or a malformed response all deny the submission. A CAPTCHA that
// silently passes when misconfigured is worse than none, because it invites
// reliance on protection that is not there.
//
// This is an abuse control, NOT an idempotency mechanism. A valid token is
// single-use, but nothing here prevents a genuine user double-submitting with
// two separately solved challenges. Durable submission idempotency is separate
// work.

const VERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const VERIFY_TIMEOUT_MS = 8000

export type TurnstileFailure =
  | 'not-configured'
  | 'missing-token'
  | 'expired'
  | 'duplicate'
  | 'invalid'
  | 'unreachable'

export interface TurnstileResult {
  ok: boolean
  reason?: TurnstileFailure
}

/** True when the server half is configured. Presence only — never the value. */
export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY)
}

/**
 * Verify a Turnstile token against Cloudflare.
 *
 * @param token    the widget-supplied response token
 * @param remoteIp optional caller IP, forwarded to Cloudflare when available
 */
export async function verifyTurnstileToken(
  token: unknown,
  remoteIp?: string | null,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // Fail closed. The caller decides how to surface this; it is a server
    // misconfiguration, not a visitor error.
    console.error('[turnstile] TURNSTILE_SECRET_KEY is not set — verification denied')
    return { ok: false, reason: 'not-configured' }
  }

  if (typeof token !== 'string' || token.trim().length === 0 || token.length > 4096) {
    return { ok: false, reason: 'missing-token' }
  }

  const form = new URLSearchParams()
  form.set('secret', secret)
  form.set('response', token.trim())
  if (remoteIp) form.set('remoteip', remoteIp)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS)

  try {
    const response = await fetch(VERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error(`[turnstile] siteverify returned HTTP ${response.status}`)
      return { ok: false, reason: 'unreachable' }
    }

    const payload: any = await response.json().catch(() => null)
    if (!payload || typeof payload !== 'object') {
      return { ok: false, reason: 'unreachable' }
    }

    if (payload.success === true) return { ok: true }

    // Error codes are logged, never returned verbatim: they are Cloudflare's
    // vocabulary, not something a visitor can act on.
    const codes: string[] = Array.isArray(payload['error-codes'])
      ? payload['error-codes'].map(String)
      : []
    console.warn(`[turnstile] verification failed (${codes.join(',') || 'no-codes'})`)

    if (codes.includes('timeout-or-duplicate')) {
      // Cloudflare uses one code for both. Treated as expired, because that is
      // the case a visitor can fix — by solving the challenge again.
      return { ok: false, reason: 'expired' }
    }
    if (codes.includes('missing-input-response')) {
      return { ok: false, reason: 'missing-token' }
    }
    if (
      codes.includes('invalid-input-secret') ||
      codes.includes('missing-input-secret')
    ) {
      return { ok: false, reason: 'not-configured' }
    }
    return { ok: false, reason: 'invalid' }
  } catch (error) {
    // Includes the abort on timeout.
    console.error(
      `[turnstile] verification error: ${
        error instanceof Error ? error.name : 'unknown'
      }`,
    )
    return { ok: false, reason: 'unreachable' }
  } finally {
    clearTimeout(timeout)
  }
}

/** Visitor-facing message for a failure reason. Never leaks configuration. */
export function turnstileFailureMessage(reason: TurnstileFailure | undefined): string {
  switch (reason) {
    case 'expired':
    case 'duplicate':
      return 'Your security check expired. Please complete it again and resubmit.'
    case 'missing-token':
      return 'Please complete the security check before submitting.'
    case 'unreachable':
      return 'We could not complete the security check just now. Please try again in a moment.'
    default:
      return 'The security check could not be verified. Please refresh the page and try again.'
  }
}
