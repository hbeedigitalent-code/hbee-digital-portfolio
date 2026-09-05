// src/app/api/client-portal/files/[id]/signed-url/route.ts
//
// Returns a short-lived signed URL for a single project_files row, but only
// if the row belongs to the CALLER's own client account. The project-files
// bucket is still public today (Batch 1C Stage 1 is preparatory) — this
// route exists so the app can be fully switched over to signed URLs before
// the bucket is ever made private, without a second round of UI changes.
//
// No admin access is added here. There is no existing admin file-view
// workflow for project_files, so none is invented in this route.
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { toProjectFilesObjectPath } from '@/lib/storage-path'

const PROJECT_FILES_BUCKET = 'project-files'
const SIGNED_URL_EXPIRY_SECONDS = 60

// Lazy, non-throwing service-role client — the same defensive pattern used
// by the Batch 1A 2FA routes. Deliberately NOT the shared
// src/lib/supabaseAdmin.ts singleton, which throws at import time when
// SUPABASE_SERVICE_ROLE_KEY is missing and would crash this whole route
// instead of returning a clean "Server configuration error" response.
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

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // 1-2. Derive the caller from THEIR OWN session — never a client-
    // supplied id/email/flag of any kind.
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = getServiceRoleClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 3. Resolve the caller's own client row. Read via the service-role
    // client rather than the session client: per the Batch 1C storage
    // audit, project_files currently has RLS enabled with NO policies
    // (deny-all), so a session-client read could be silently blocked
    // regardless of ownership. The ownership boundary itself is still
    // derived entirely from the session-authenticated user.id below —
    // never from anything the browser supplies.
    const { data: clientRow } = await adminClient
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!clientRow) {
      // Same 404 as "file not found" below — this response can never be
      // used to distinguish "you're not a client" from "wrong file id".
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 4-5. Fetch the file, double-scoped to id AND this client's own id in
    // one query. A file that exists but belongs to someone else produces
    // the exact same response as a file that doesn't exist — this route
    // can never be used to enumerate another client's file ids.
    const { data: fileRow } = await adminClient
      .from('project_files')
      .select('id, file_url')
      .eq('id', params.id)
      .eq('client_id', clientRow.id)
      .maybeSingle()

    if (!fileRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 6-7. Normalize + validate. Fail closed on anything unexpected — the
    // raw file_url value is never passed to Storage.
    const objectPath = toProjectFilesObjectPath(fileRow.file_url, clientRow.id)
    if (!objectPath) {
      console.error('❌ Unable to resolve a safe object path for project_files row', fileRow.id)
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 8-9. Service role only, short expiry.
    const { data: signedData, error: signError } = await adminClient.storage
      .from(PROJECT_FILES_BUCKET)
      .createSignedUrl(objectPath, SIGNED_URL_EXPIRY_SECONDS)

    if (signError || !signedData) {
      console.error('❌ Failed to create signed URL:', signError)
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
    }

    // 10-11. Only the signed URL — no service-role key, no raw row, no path.
    return NextResponse.json({ url: signedData.signedUrl })
  } catch (error: any) {
    console.error('Signed URL route error:', error)
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }
}
