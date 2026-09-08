// src/app/api/notifications/[id]/read/route.ts
//
// POST — marks ONE caller-owned notification as read.
//
// Batch N2-C. The row is located by the caller-derived ownership predicate AND
// the route id together, so a notification belonging to another client, or to
// the admin scope, simply does not match. A non-match returns 404 — the same
// response as a genuinely nonexistent id — so the endpoint never reveals that
// an id exists but belongs to someone else.
//
// Only read_at and the legacy read flag are written. title, message, link,
// recipient_scope, recipient_id, entity_type, entity_id, user_id, user_type and
// idempotency_key are never touched by this route, and the database grant to
// `authenticated` is column-limited to (read, read_at) as a second barrier.
//
// Not covered by middleware.ts (its matcher is /admin/:path*,
// /admin-2fa-challenge and /client-portal/:path*, not /api/*), so session, 2FA
// and active-admin are all verified here independently.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'

// Lazy, non-throwing service-role client — the same defensive pattern used by
// the /api/admin routes. Deliberately NOT the shared src/lib/supabaseAdmin.ts
// singleton, which throws at import time when SUPABASE_SERVICE_ROLE_KEY is
// missing.
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Only presentation fields leave the server.
const NOTIFICATION_COLUMNS =
  'id, type, title, message, link, entity_type, entity_id, recipient_scope, created_at, read_at'

type Caller = { scope: 'admin' } | { scope: 'client'; clientId: string }

type CallerResult =
  | { ok: true; caller: Caller; adminClient: any }
  | { ok: false; response: NextResponse }

async function resolveCaller(): Promise<CallerResult> {
  const sessionClient = createServerSupabaseClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  const adminClient = getServiceRoleClient()
  if (!adminClient) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }),
    }
  }

  const { data: adminRow } = await adminClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (adminRow) {
    // Admin-scope rows are never mutated without a valid signed 2FA
    // attestation — the same generic 401 every other admin API route returns.
    const cookieValue = cookies().get(ADMIN_2FA_COOKIE_NAME)?.value
    const twoFAVerified = await verifyAdmin2FACookie(cookieValue, user.id)
    if (!twoFAVerified) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
      }
    }
    return { ok: true, caller: { scope: 'admin' }, adminClient }
  }

  const { data: clientRow } = await adminClient
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!clientRow?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not found' }, { status: 404 }),
    }
  }

  return { ok: true, caller: { scope: 'client', clientId: clientRow.id }, adminClient }
}

// Applies the caller-derived ownership predicate. Nothing from the request
// contributes to it.
function scoped(query: any, caller: Caller) {
  return caller.scope === 'admin'
    ? query.eq('recipient_scope', 'admin')
    : query.eq('recipient_scope', 'client').eq('recipient_id', caller.clientId)
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const notificationId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(notificationId)) {
      return NextResponse.json({ error: 'Invalid notification id' }, { status: 400 })
    }

    const resolved = await resolveCaller()
    if (!resolved.ok) return resolved.response

    const { caller, adminClient } = resolved

    // Ownership check: the id must match a row the caller's own scope covers.
    const { data: existing, error: lookupError } = await scoped(
      adminClient.from('notifications').select('id'),
      caller,
    )
      .eq('id', notificationId)
      .maybeSingle()

    if (lookupError) {
      console.error('❌ Failed to load notification:', lookupError)
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
    }

    // Same 404 whether the id does not exist or belongs to somebody else.
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // The ownership predicate is re-applied to the UPDATE itself, so the write
    // cannot escape the caller's scope even if the lookup above were bypassed.
    const { data: updated, error: updateError } = await scoped(
      adminClient.from('notifications').update({
        read_at: new Date().toISOString(),
        read: true,
      }),
      caller,
    )
      .eq('id', notificationId)
      .select(NOTIFICATION_COLUMNS)
      .single()

    if (updateError || !updated) {
      console.error('❌ Failed to mark notification read:', updateError)
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
    }

    return NextResponse.json({ success: true, notification: updated })
  } catch (error) {
    console.error('❌ Mark-read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
