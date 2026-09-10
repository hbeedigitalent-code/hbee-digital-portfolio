// src/app/api/client-portal/proposals/[id]/route.ts
//
// GET — one proposal, but only if it belongs to the CALLER's own client account
// and has actually been delivered to the portal.
//
// Ownership predicate (all parts required):
//   proposals.id        = :proposalId
//   proposals.client_id = <clients.id resolved from the session>
//   proposals.status   IN ('sent','viewed','approved','changes_requested')
//
// A draft, rejected or expired proposal returns the SAME 404 as an unknown id,
// as does a proposal owned by someone else, as does a caller with no clients
// row — so this route cannot be used to enumerate proposals or to learn that
// another client's proposal exists.
//
// Attachment metadata is joined server-side. object_path is excluded from the
// select() itself and never leaves the server; downloads go exclusively through
// /api/client-portal/proposals/[id]/files/[fileId]/signed-url.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Statuses at which a proposal is visible in the client portal.
// NOT exported: a Next.js Route Handler module may only export HTTP method
// handlers and Next's own config keys (dynamic, revalidate, runtime, …). Any
// other named export fails the build's generated route-type check — which
// `tsc --noEmit` cannot see, because those types are emitted during the build.
const CLIENT_VISIBLE_STATUSES = ['sent', 'viewed', 'approved', 'changes_requested']

// Commercial and presentational fields only. merchant_id, created_by,
// growth_profile_id and any internal column are deliberately not selected.
// `notes` IS included because the admin proposal UI labels it "Internal Notes";
// see the note in the page — it is NOT rendered to the client.
const PROPOSAL_COLUMNS = `
  id,
  proposal_number,
  title,
  status,
  services,
  pricing,
  timeline,
  terms,
  expires_at,
  sent_at,
  accepted_at,
  created_at,
  updated_at,
  merchant:merchants(business_name, contact_name, email, website)
`

const FILE_METADATA_COLUMNS = 'id, proposal_id, file_name, file_type, file_size, uploaded_at'

// Lazy, non-throwing service-role client — the same defensive pattern used by
// the other client-portal routes. proposals and proposal_files are read through
// it because proposal_files has RLS enabled with no policies (deny-all); the
// ownership boundary below is still derived entirely from the session user.
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

    const { data: clientRow } = await adminClient
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!clientRow?.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: proposal } = await adminClient
      .from('proposals')
      .select(PROPOSAL_COLUMNS)
      .eq('id', proposalId)
      .eq('client_id', clientRow.id)
      .in('status', CLIENT_VISIBLE_STATUSES)
      .maybeSingle()

    if (!proposal) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: fileRows } = await adminClient
      .from('proposal_files')
      .select(FILE_METADATA_COLUMNS)
      .eq('proposal_id', proposalId)
      .order('uploaded_at', { ascending: false })

    return NextResponse.json({ proposal, files: fileRows || [] })
  } catch (error) {
    console.error('❌ Client proposal detail error:', error)
    return NextResponse.json({ error: 'Failed to load proposal' }, { status: 500 })
  }
}
