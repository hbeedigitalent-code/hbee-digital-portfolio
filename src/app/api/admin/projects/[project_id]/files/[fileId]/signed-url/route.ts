// src/app/api/admin/projects/[project_id]/files/[fileId]/signed-url/route.ts
//
// Returns a short-lived signed URL for a single project_files row, but only
// to an active, 2FA-verified admin, and only for a file that actually
// belongs to the requested project. The project-files bucket is still
// public today — this route exists so the admin file-review UI is already
// signed-URL-based before the bucket is ever made private.
//
// Not covered by middleware.ts (its matcher does not include
// /api/admin/:path*), so session, 2FA, and active-admin are all re-verified
// here independently, in the same order middleware uses for /admin/* pages.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'
import { toProjectFilesObjectPath } from '@/lib/storage-path'

const PROJECT_FILES_BUCKET = 'project-files'
const SIGNED_URL_EXPIRY_SECONDS = 60

// Lazy, non-throwing service-role client — same pattern as every other
// route in Batch 1A/1C. Deliberately NOT the shared
// src/lib/supabaseAdmin.ts singleton, which throws at import time when
// SUPABASE_SERVICE_ROLE_KEY is missing.
let serviceRoleClient: any = null

function getServiceRoleClient() {
  if (serviceRoleClient) return serviceRoleClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) return null

  const { createClient } = require('@supabase/supabase-js')
  serviceRoleClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return serviceRoleClient
}

export async function GET(
  request: Request,
  { params }: { params: { project_id: string; fileId: string } },
) {
  try {
    // 1-2. Derive the caller from THEIR OWN session — never a client-
    // supplied id/email/role/isAdmin/clientId flag.
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 3-4. Verify the existing signed 2FA cookie before any service-role
    // query — same function middleware.ts uses, no duplicated HMAC logic.
    // verifyAdmin2FACookie() checks the payload's uid against `user.id`
    // itself, covering both "validly signed and unexpired" and "belongs to
    // this session's user" in one call. A missing/invalid/mismatched cookie
    // gets the same generic 401 as "no session".
    const cookieValue = cookies().get(ADMIN_2FA_COOKIE_NAME)?.value
    const twoFAVerified = await verifyAdmin2FACookie(cookieValue, user.id)
    if (!twoFAVerified) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = getServiceRoleClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 5. Active-admin status, verified server-side via the service-role
    // client — never trusted from the browser.
    const { data: adminRow } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!adminRow) {
      return NextResponse.json({ error: 'Not authorized as admin' }, { status: 403 })
    }

    // 6-7. Double-scoped to id AND the project_id in the URL, in one query.
    // A file that exists but belongs to a different project produces the
    // EXACT same response as a file that doesn't exist — an admin who
    // guesses a valid file id while browsing the wrong project can never
    // distinguish the two, and can never be handed a signed URL for a file
    // outside the project they're looking at.
    const { data: fileRow } = await adminClient
      .from('project_files')
      .select('id, client_id, file_url')
      .eq('id', params.fileId)
      .eq('project_id', params.project_id)
      .maybeSingle()

    if (!fileRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 8-9. Normalize + validate using the SAME helper the client route
    // uses, unmodified. expectedClientId is the file row's own client_id
    // (the file's owning client), not the admin's — admins have none.
    // Fail closed on anything unexpected: the raw file_url is never passed
    // to Storage.
    const objectPath = toProjectFilesObjectPath(fileRow.file_url, fileRow.client_id)
    if (!objectPath) {
      console.error('❌ Unable to resolve a safe object path for project_files row', fileRow.id)
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 10-11. Service role only, short expiry.
    const { data: signedData, error: signError } = await adminClient.storage
      .from(PROJECT_FILES_BUCKET)
      .createSignedUrl(objectPath, SIGNED_URL_EXPIRY_SECONDS)

    if (signError || !signedData) {
      console.error('❌ Failed to create signed URL:', signError)
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
    }

    // 12-13. Only the signed URL — no service-role key, no raw row, no path.
    return NextResponse.json({ url: signedData.signedUrl })
  } catch (error: any) {
    console.error('Admin signed URL route error:', error)
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }
}
