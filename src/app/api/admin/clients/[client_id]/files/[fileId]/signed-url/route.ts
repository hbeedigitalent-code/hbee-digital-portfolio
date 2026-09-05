// src/app/api/admin/clients/[client_id]/files/[fileId]/signed-url/route.ts
//
// Short-lived signed URL for a single project_files row, scoped to ONE
// client, for an active 2FA-verified admin. This is the client-level
// counterpart to /api/admin/projects/[project_id]/files/[fileId]/signed-url,
// which cannot serve a file whose project_id is NULL (a "General" client
// upload). Same auth chain, same helper, same fail-closed behavior.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'
import { toProjectFilesObjectPath } from '@/lib/storage-path'

const PROJECT_FILES_BUCKET = 'project-files'
const SIGNED_URL_EXPIRY_SECONDS = 60

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
  { params }: { params: { client_id: string; fileId: string } },
) {
  try {
    // 1-2. Caller from THEIR OWN session.
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 3-4. Signed 2FA cookie, verified before any service-role query. Same
    // generic 401 for a missing/invalid/mismatched cookie as for no session.
    const cookieValue = cookies().get(ADMIN_2FA_COOKIE_NAME)?.value
    const twoFAVerified = await verifyAdmin2FACookie(cookieValue, user.id)
    if (!twoFAVerified) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = getServiceRoleClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 5. Active-admin status, server-side.
    const { data: adminRow } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!adminRow) {
      return NextResponse.json({ error: 'Not authorized as admin' }, { status: 403 })
    }

    // 6. Double-scoped to id AND the client_id in the URL, in one query. A
    // file that exists but belongs to a different client produces the exact
    // same 404 as a file that does not exist.
    const { data: fileRow } = await adminClient
      .from('project_files')
      .select('id, client_id, file_url')
      .eq('id', params.fileId)
      .eq('client_id', params.client_id)
      .maybeSingle()

    if (!fileRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 7. Normalize + validate with the SAME unmodified helper the other
    // signed-url routes use. expectedClientId is the file row's own
    // client_id. Fail closed: the raw file_url is never passed to Storage.
    const objectPath = toProjectFilesObjectPath(fileRow.file_url, fileRow.client_id)
    if (!objectPath) {
      console.error('❌ Unable to resolve a safe object path for project_files row', fileRow.id)
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 8. Service role only, short expiry.
    const { data: signedData, error: signError } = await adminClient.storage
      .from(PROJECT_FILES_BUCKET)
      .createSignedUrl(objectPath, SIGNED_URL_EXPIRY_SECONDS)

    if (signError || !signedData) {
      console.error('❌ Failed to create signed URL:', signError)
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
    }

    // 9. Only the signed URL.
    return NextResponse.json({ url: signedData.signedUrl })
  } catch (error: any) {
    console.error('Admin client signed URL route error:', error)
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }
}
