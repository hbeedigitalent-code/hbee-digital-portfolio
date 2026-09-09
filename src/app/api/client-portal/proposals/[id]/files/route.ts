// src/app/api/client-portal/proposals/[id]/files/route.ts
//
// GET — lists the attachments on ONE proposal, but only if that proposal
// belongs to the CALLER's own client account and has actually been sent.
//
// Ownership predicate (all parts required):
//   proposals.id        = :proposalId
//   proposals.client_id = <clients.id resolved from the session>
//   proposals.status   IN ('sent','viewed','approved','changes_requested')
//   proposal_files.proposal_id = :proposalId
//
// A draft, rejected or expired proposal is invisible: attachments exist for the
// admin's benefit long before the proposal is delivered, and a client must not
// see documents for something never sent to them. A proposal whose client_id is
// NULL (merchant not linked to a portal account) is unreachable by anyone here.
//
// Every miss — wrong owner, wrong status, unknown id, caller is not a client —
// returns the SAME 404, so this route cannot be used to enumerate proposals or
// distinguish "exists but not yours" from "does not exist".
//
// Metadata only: object_path is excluded from the select() itself and never
// leaves the server.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Statuses at which a proposal has been delivered to the client portal. */
const CLIENT_VISIBLE_STATUSES = ['sent', 'viewed', 'approved', 'changes_requested']

const FILE_METADATA_COLUMNS = 'id, proposal_id, file_name, file_type, file_size, uploaded_at'

// Lazy, non-throwing service-role client — the same defensive pattern used by
// the existing client-portal signed-url route. proposal_files has RLS enabled
// with no policies (deny-all), so a session-client read would be blocked
// regardless of ownership; the ownership boundary below is still derived
// entirely from the session-authenticated user.id, never from the browser.
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

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    // 1. Derive the caller from THEIR OWN session — never a client-supplied
    //    id/email/flag of any kind.
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
    if (!UUID_RE.test(proposalId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 2. Resolve the caller's own client row.
    const { data: clientRow } = await adminClient
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!clientRow?.id) {
      // Same 404 as every other miss below.
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 3. Ownership + status, enforced in one query.
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

    // 4. Attachments for that verified proposal. Metadata only.
    const { data: fileRows, error: filesError } = await adminClient
      .from('proposal_files')
      .select(FILE_METADATA_COLUMNS)
      .eq('proposal_id', proposalId)
      .order('uploaded_at', { ascending: false })

    if (filesError) {
      console.error('❌ Failed to list client proposal files:', filesError)
      return NextResponse.json({ error: 'Failed to load files' }, { status: 500 })
    }

    return NextResponse.json({ files: fileRows || [] })
  } catch (error) {
    console.error('❌ Client proposal file list error:', error)
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 })
  }
}
