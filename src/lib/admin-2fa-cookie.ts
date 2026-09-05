// src/lib/admin-2fa-cookie.ts
//
// Signs and verifies the short-lived "2FA verified" attestation cookie.
//
// This module MUST run in both the Edge middleware runtime and Node route
// handlers, so it uses only Web Crypto (`crypto.subtle`, global `atob`/`btoa`)
// — never Node's `crypto` module or `Buffer`, neither of which exists in Edge.
//
// The cookie is never a source of truth by itself: it only attests "the user
// identified by `uid` completed TOTP verification before `exp`". Middleware
// still separately confirms the caller holds a valid Supabase session for
// that same `uid` and an active `admin_users` row — this module answers only
// "is the 2FA step done", nothing about identity or admin status.
//
// Fail-closed by design: every function below returns a value meaning "not
// verified" / "cannot sign" when `ADMIN_2FA_COOKIE_SECRET` is unset. Nothing
// in this file ever treats a missing secret as "2FA not required".

export const ADMIN_2FA_COOKIE_NAME = 'admin_2fa_verified'

/** 12 hours — long enough for a workday, short enough that "fresh verification
 *  per login" is meaningful. Cleared explicitly on logout regardless. */
export const ADMIN_2FA_COOKIE_MAX_AGE_SECONDS = 12 * 60 * 60

interface Admin2FACookiePayload {
  uid: string
  iat: number
  exp: number
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + padding)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/**
 * Sign a fresh "verified" cookie value for `userId`.
 * Returns `null` if `ADMIN_2FA_COOKIE_SECRET` is not set — callers MUST treat
 * a `null` result as "cannot attest 2FA" and fail the request (500), never as
 * "2FA not required".
 */
export async function signAdmin2FACookie(userId: string): Promise<string | null> {
  const secret = process.env.ADMIN_2FA_COOKIE_SECRET
  if (!secret) return null

  const now = Date.now()
  const payload: Admin2FACookiePayload = {
    uid: userId,
    iat: now,
    exp: now + ADMIN_2FA_COOKIE_MAX_AGE_SECONDS * 1000,
  }

  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const key = await importHmacKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64))
  const sigB64 = toBase64Url(new Uint8Array(signature))

  return `${payloadB64}.${sigB64}`
}

/**
 * Verify a cookie value attests a completed, unexpired 2FA check for `userId`.
 * Fails closed on every possible problem: missing secret, missing/malformed
 * cookie, bad signature, uid mismatch, or expiry — all return `false`.
 */
export async function verifyAdmin2FACookie(
  cookieValue: string | undefined | null,
  userId: string,
): Promise<boolean> {
  const secret = process.env.ADMIN_2FA_COOKIE_SECRET
  if (!secret) return false
  if (!cookieValue) return false

  const parts = cookieValue.split('.')
  if (parts.length !== 2) return false
  const [payloadB64, sigB64] = parts

  try {
    const key = await importHmacKey(secret)
    // Re-wrap in a fresh Uint8Array so TS resolves it against a concrete
    // ArrayBuffer (not the wider ArrayBufferLike), matching the BufferSource
    // signature crypto.subtle.verify expects.
    const signatureBytes = new Uint8Array(fromBase64Url(sigB64))
    const signatureValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(payloadB64),
    )
    if (!signatureValid) return false

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payloadB64)),
    ) as Partial<Admin2FACookiePayload>

    if (typeof payload.uid !== 'string' || payload.uid !== userId) return false
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return false

    return true
  } catch {
    // Malformed base64/JSON, unsupported algorithm, etc. — never throw out of
    // a security check; treat any decode failure as "not verified".
    return false
  }
}

/**
 * Cookie attributes shared by every place that sets or clears this cookie.
 * `secure` is tied to NODE_ENV rather than hardcoded `true` because a `Secure`
 * cookie is silently refused by the browser over plain HTTP — which is how
 * `next start` serves locally. Production (Vercel) is always HTTPS.
 */
export function getAdmin2FACookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    // Path is '/' (not '/admin') so this cookie is also sent to
    // /api/admin/* routes — those live under a sibling path, not a child of
    // /admin/, so a Path=/admin cookie is never attached to them by the
    // browser (RFC 6265 path-match). middleware.ts still restricts WHERE
    // this cookie is enforced (only /admin/:path* and /admin-2fa-challenge)
    // and every /api/admin/* route independently re-verifies the signature,
    // UID binding, and expiry before trusting it — widening Path does not
    // widen who can produce a valid signature.
    path: '/',
    maxAge: ADMIN_2FA_COOKIE_MAX_AGE_SECONDS,
  }
}

/** Attributes for clearing the cookie — same path/flags, maxAge 0. */
export function getAdmin2FAClearCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
}
