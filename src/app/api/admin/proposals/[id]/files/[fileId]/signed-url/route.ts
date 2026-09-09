// src/app/api/admin/proposals/[id]/files/[fileId]/signed-url/route.ts
//
// Returns a 60-second signed URL for one proposal attachment, for an
// authenticated, 2FA-verified, active admin.
//
// The row is fetched double-scoped on id AND proposal_id, so a file that exists
// under a different proposal produces the same 404 as one that does not exist —
// this route cannot be used to enumerate attachments across proposals.
//
// The bucket is private; object_path is resolved and validated server-side and
// never returned. Only { url } leaves this route.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'
import {
  PROPOSAL_FILES_BUCKET,
  toProposalFilesObjectPath,
} from '@/lib/proposal-storage-path'

const SIGNED_URL_EXPIRY_SECONDS = 60
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Lazy, non-throwing service-role client — the same defensive pattern used by
// the other /api/admin routes.
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
  _request: Request,
  { params }: { params: { id: string; fileId: string } },
) {
  try {
    // 1-2. Session.
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 3-4. Signed 2FA attestation, before any admin_users / service-role query.
    const cookieValue = cookies().get(ADMIN_2FA_COOKIE_NAME)?.value
    const twoFAVerified = await verifyAdmin2FACookie(cookieValue, user.id)
    if (!twoFAVerified) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 7. Service-role only after session + 2FA.
    const adminClient = getServiceRoleClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 5-6. Active admin.
    const { data: adminRow } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!adminRow) {
      return NextResponse.json({ error: 'Not authorized as admin' }, { status: 403 })
    }

    const proposalId = typeof params?.id === 'string' ? params.id.trim() : ''
    const fileId = typeof params?.fileId === 'string' ? params.fileId.trim() : ''

    if (!UUID_RE.test(proposalId) || !UUID_RE.test(fileId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Double-scoped: both the file id AND its parent proposal must match.
    const { data: fileRow } = await adminClient
      .from('proposal_files')
      .select('id, object_path')
      .eq('id', fileId)
      .eq('proposal_id', proposalId)
      .maybeSingle()

    if (!fileRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Normalize + validate. Fail closed — the raw value never reaches Storage.
    const objectPath = toProposalFilesObjectPath(fileRow.object_path, proposalId)
    if (!objectPath) {
      console.error('❌ Unable to resolve a safe object path for proposal_files row', fileRow.id)
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { data: signedData, error: signError } = await adminClient.storage
      .from(PROPOSAL_FILES_BUCKET)
      .createSignedUrl(objectPath, SIGNED_URL_EXPIRY_SECONDS)

    if (signError || !signedData) {
      console.error('❌ Failed to create signed URL:', signError)
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
    }

    // Only the signed URL — no service-role key, no raw row, no path.
    return NextResponse.json({ url: signedData.signedUrl })
  } catch (error) {
    console.error('❌ Proposal signed URL route error:', error)
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }
}
