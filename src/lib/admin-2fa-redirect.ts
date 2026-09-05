// src/lib/admin-2fa-redirect.ts
//
// Validates the `next` redirect target used by /admin-2fa-challenge. Kept out
// of page.tsx itself because Next.js only allows a fixed set of named exports
// from a page file (default, metadata, generateStaticParams, ...) — any other
// export fails the build's route-type check.

/**
 * Only an internal /admin/... path is ever a valid post-verification
 * destination. Anything else — an absolute URL (https://evil.com),
 * protocol-relative (//evil.com), or the challenge route itself — must fall
 * back to /admin/dashboard.
 */
export function isSafeAdminRedirect(value: string | undefined | null): value is string {
  if (!value) return false
  if (!value.startsWith('/admin/')) return false
  if (value.startsWith('//')) return false // belt-and-suspenders; startsWith('/admin/') already excludes this
  if (value.includes('://')) return false
  return true
}
