// src/app/api/client-portal/proposals/route.ts
//
// GET — every proposal that has actually been delivered to the CALLER's own
// client account.
//
// Ownership predicate (both parts required):
//   proposals.client_id = <clients.id resolved from the session>
//   proposals.status   IN ('sent','viewed','approved','changes_requested')
//
// Drafts, rejected and expired proposals are excluded, as are proposals with a
// NULL client_id, which belong to no portal account at all.
//
// A caller with no clients row receives an empty list rather than a 403: the
// response is identical to a client who simply has no proposals yet, so the
// endpoint cannot be used to probe account state. For the same reason there is
// no total count and no "forbidden" branch — an unauthorised or unlinked caller
// and an empty account are indistinguishable.
//
// Attachment metadata is NOT joined here; the list needs none, and
// proposal_files.object_path never leaves the server in any route.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Statuses at which a proposal is visible in the client portal — the same set
// the detail route enforces.
const CLIENT_VISIBLE_STATUSES = ['sent', 'viewed', 'approved', 'changes_requested']

// Safe display fields only. merchant_id, client_id, created_by, notes,
// growth_profile_id, terms and any internal column are deliberately not
// selected. `notes` in particular is the admin's "Internal Notes" field.
const LIST_COLUMNS = `
  id,
  proposal_number,
  title,
  status,
  pricing,
  expires_at,
  sent_at,
  created_at,
  merchant:merchants(business_name)
`

// Defensive upper bound so a pathological account cannot request an unbounded
// scan. The portal has no pagination UI yet; this is a ceiling, not a page.
const MAX_ROWS = 200

// Lazy, non-throwing service-role client — the same defensive pattern used by
// the other client-portal routes. The ownership boundary below is still derived
// entirely from the session user; the service role only bypasses RLS.
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

export async function GET() {
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

    // clients.id is resolved from the session user and from nothing else. No
    // client_id, email, merchant name or proposal number is read from the
    // request.
    const { data: clientRow } = await adminClient
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!clientRow?.id) {
      return NextResponse.json({ proposals: [] })
    }

    const { data: rows, error } = await adminClient
      .from('proposals')
      .select(LIST_COLUMNS)
      .eq('client_id', clientRow.id)
      .in('status', CLIENT_VISIBLE_STATUSES)
      .order('sent_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS)

    if (error) {
      console.error('❌ Client proposal list error:', error)
      return NextResponse.json({ error: 'Failed to load proposals' }, { status: 500 })
    }

    return NextResponse.json({ proposals: rows || [] })
  } catch (error) {
    console.error('❌ Client proposal list error:', error)
    return NextResponse.json({ error: 'Failed to load proposals' }, { status: 500 })
  }
}
