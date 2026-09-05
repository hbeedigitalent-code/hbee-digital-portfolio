// src/lib/storage-path.ts
//
// Normalizes and validates a project_files.file_url database value into a
// safe, bucket-relative object path before it is ever passed to
// createSignedUrl(). Every return path is either a validated path or `null`
// — callers MUST treat `null` as "cannot produce a signed URL for this row"
// and fail closed. The raw database value is never forwarded to Storage.
//
// Accepts exactly two shapes:
//   1. A bare project-files object path (the shape new uploads store).
//   2. A full Supabase public-storage URL for THIS project and exactly the
//      project-files bucket (the shape every existing row currently has).
// Rejects everything else, including: empty/non-string values, a URL for a
// different bucket, a URL for a different Supabase project/host, a leading
// slash, `..` path traversal, backslashes, and malformed percent-encoding.

const PROJECT_FILES_BUCKET = 'project-files'
const UPLOAD_PREFIX = 'client-files/'

/**
 * decodeURIComponent that never throws. A string containing a literal `%`
 * not followed by two hex digits (URIError: "malformed URI sequence") is
 * treated as malformed percent-encoding and rejected, per the required
 * behavior. NOTE: this means a legitimate filename that happens to contain
 * a raw `%` not meant as an escape (e.g. "50%off.pdf") would also fail this
 * check, since upload() currently stores the literal filename unescaped —
 * a narrow, intentional trade-off in favor of rejecting ambiguous input
 * rather than guessing. If this ever becomes a real problem, the fix is to
 * percent-encode path segments consistently at upload time, not to loosen
 * this check.
 */
function decodeSafely(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

function isTraversalSafe(path: string): boolean {
  if (!path) return false
  if (path.startsWith('/')) return false // leading-slash / absolute path
  if (path.includes('..')) return false // parent-directory traversal
  if (path.includes('\\')) return false // defensive: no backslashes
  return true
}

/**
 * @param fileUrl the raw project_files.file_url database value
 * @param expectedClientId when provided, the resolved path must additionally
 *   start with `client-files/{expectedClientId}/` — the exact convention
 *   every upload uses (client-portal/files/page.tsx). The signed-url route
 *   always passes this, since it already knows which client the row is
 *   supposed to belong to; it is optional so this function can also be
 *   exercised generically (e.g. in a unit test) without that context.
 */
export function toProjectFilesObjectPath(
  fileUrl: string | null | undefined,
  expectedClientId?: string,
): string | null {
  if (typeof fileUrl !== 'string' || fileUrl.length === 0) return null

  let candidate: string

  if (/^https?:\/\//i.test(fileUrl)) {
    // Must be a full public URL for THIS Supabase project and exactly the
    // project-files bucket — never another bucket, host, or project.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return null // can't confirm the project matches -> fail closed

    const base = supabaseUrl.replace(/\/+$/, '')
    const marker = `${base}/storage/v1/object/public/${PROJECT_FILES_BUCKET}/`
    if (!fileUrl.startsWith(marker)) return null

    const decoded = decodeSafely(fileUrl.slice(marker.length))
    if (decoded === null) return null
    candidate = decoded
  } else {
    // Already a bare object path (the preferred shape for new uploads).
    const decoded = decodeSafely(fileUrl)
    if (decoded === null) return null
    candidate = decoded
  }

  if (!isTraversalSafe(candidate)) return null

  if (expectedClientId) {
    const expectedPrefix = `${UPLOAD_PREFIX}${expectedClientId}/`
    if (!candidate.startsWith(expectedPrefix)) return null
  }

  return candidate
}
