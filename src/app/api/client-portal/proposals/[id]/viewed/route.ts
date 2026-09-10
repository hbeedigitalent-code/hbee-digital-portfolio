// src/app/api/client-portal/proposals/[id]/viewed/route.ts
//
// POST — marks a proposal as viewed. The ONLY transition allowed here is
// sent → viewed.
//
// The `.eq('status', 'sent')` in the UPDATE is the guard, not just a filter: a
// proposal already in viewed / approved / changes_requested matches zero rows
// and the request 404s, so a client can never walk an approved or
// changes-requested proposal back to viewed. That also makes the operation
// naturally idempotent under concurrent requests — only the first one wins.
//
// There is NO viewed_at column in this schema (only sent_at and accepted_at
// exist and are used), so only `status` and `updated_at` are written. No column
// is invented and no migration is implied.
//
// Merely viewing a proposal creates NO notification.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

export async function POST(_request: Request, { params }: { params: { id: string } }) {
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

    // Ownership AND the sent-only precondition are enforced in the UPDATE
    // itself. Nothing but status/updated_at is written — no client-supplied
    // field reaches the database.
    const { data: updated, error: updateError } = await adminClient
      .from('proposals')
      .update({ status: 'viewed', updated_at: new Date().toISOString() })
      .eq('id', proposalId)
      .eq('client_id', clientRow.id)
      .eq('status', 'sent')
      .select('id, status')
      .maybeSingle()

    if (updateError) {
      console.error('❌ Failed to mark proposal viewed:', updateError)
      return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 })
    }

    if (!updated) {
      // Not owned, unknown, or not in `sent` — one indistinguishable response.
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, status: updated.status })
  } catch (error) {
    console.error('❌ Client proposal viewed error:', error)
    return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 })
  }
}
