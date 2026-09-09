// src/app/api/client-portal/proposals/[id]/files/[fileId]/signed-url/route.ts
//
// Returns a 60-second signed URL for ONE proposal attachment, but only if the
// parent proposal belongs to the CALLER's own client account and has actually
// been sent.
//
// Ownership predicate (all parts required):
//   proposals.id               = :proposalId
//   proposals.client_id        = <clients.id resolved from the session>
//   proposals.status          IN ('sent','viewed','approved','changes_requested')
//   proposal_files.id          = :fileId
//   proposal_files.proposal_id = :proposalId
//
// Every miss — wrong owner, wrong status, file belongs to a different proposal,
// unknown id, caller is not a client — returns the SAME 404. The route cannot
// be used to enumerate proposals or attachments, or to distinguish "exists but
// not yours" from "does not exist".
//
// The bucket is private; object_path is resolved and validated server-side and
// never returned. Only { url } leaves this route.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  PROPOSAL_FILES_BUCKET,
  toProposalFilesObjectPath,
} from '@/lib/proposal-storage-path'

const SIGNED_URL_EXPIRY_SECONDS = 60
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Statuses at which a proposal has been delivered to the client portal. */
const CLIENT_VISIBLE_STATUSES = ['sent', 'viewed', 'approved', 'changes_requested']

// Lazy, non-throwing service-role client — the same defensive pattern used by
// the existing client-portal signed-url route.
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
    // 1. Derive the caller from THEIR OWN session.
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

    const proposalId = typeof params?.id === 'string' ? params.id.trim() : ''
    const fileId = typeof params?.fileId === 'string' ? params.fileId.trim() : ''

    if (!UUID_RE.test(proposalId) || !UUID_RE.test(fileId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 2. Resolve the caller's own client row.
    const { data: clientRow } = await adminClient
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!clientRow?.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 3. Proposal ownership + status.
    const { data: proposalRow } = await adminClient
      .from('proposals')
      .select('id')
      .eq('id', proposalId)
      .eq('client_id', clientRow.id)
      .in('status', CLIENT_VISIBLE_STATUSES)
      .maybeSingle()

    if (!proposalRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 4. The file must belong to that same verified proposal.
    const { data: fileRow } = await adminClient
      .from('proposal_files')
      .select('id, object_path')
      .eq('id', fileId)
      .eq('proposal_id', proposalId)
      .maybeSingle()

    if (!fileRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 5. Normalize + validate. Fail closed — the raw value never reaches Storage.
    const objectPath = toProposalFilesObjectPath(fileRow.object_path, proposalId)
    if (!objectPath) {
      console.error('❌ Unable to resolve a safe object path for proposal_files row', fileRow.id)
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 6. Service role only, short expiry.
    const { data: signedData, error: signError } = await adminClient.storage
      .from(PROPOSAL_FILES_BUCKET)
      .createSignedUrl(objectPath, SIGNED_URL_EXPIRY_SECONDS)

    if (signError || !signedData) {
      console.error('❌ Failed to create signed URL:', signError)
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
    }

    // 7. Only the signed URL — no service-role key, no raw row, no path.
    return NextResponse.json({ url: signedData.signedUrl })
  } catch (error) {
    console.error('❌ Client proposal signed URL route error:', error)
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }
}
