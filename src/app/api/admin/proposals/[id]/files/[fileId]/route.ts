// src/app/api/admin/proposals/[id]/files/[fileId]/route.ts
//
// DELETE — removes one proposal attachment, for an authenticated, 2FA-verified,
// active admin.
//
// Deletion by file id alone is not possible: the row must match BOTH the file
// id and the proposal id from the URL, so an attachment can only be removed
// through its own proposal.
//
// Order matters. The storage object is removed FIRST and the metadata row only
// after that succeeds. The reverse order could delete the row while the object
// survives, leaving an unreferenced private object that nothing can ever list
// or clean up. This order's failure mode — object gone, row still present — is
// visible in the UI and recoverable.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'
import {
  PROPOSAL_FILES_BUCKET,
  toProposalFilesObjectPath,
} from '@/lib/proposal-storage-path'

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

export async function DELETE(
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

    const objectPath = toProposalFilesObjectPath(fileRow.object_path, proposalId)
    if (!objectPath) {
      console.error('❌ Unable to resolve a safe object path for proposal_files row', fileRow.id)
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Storage first.
    const { error: removeError } = await adminClient.storage
      .from(PROPOSAL_FILES_BUCKET)
      .remove([objectPath])

    if (removeError) {
      console.error('❌ Failed to remove proposal object:', removeError)
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
    }

    // Metadata only after the object is gone.
    const { error: deleteError } = await adminClient
      .from('proposal_files')
      .delete()
      .eq('id', fileId)
      .eq('proposal_id', proposalId)

    if (deleteError) {
      console.error('❌ Object removed but metadata delete failed:', deleteError)
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Proposal file delete error:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}
