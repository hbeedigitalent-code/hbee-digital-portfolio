// src/app/api/notifications/read-all/route.ts
//
// POST — marks every currently-unread notification the caller owns as read.
//
// Batch N2-C. The UPDATE carries only the caller-derived ownership predicate
// plus `read_at IS NULL`. An admin can therefore only clear admin-scope rows,
// and a client can only clear rows whose recipient_id is their own clients.id —
// never another client's, and never the admin feed. The request body is ignored
// entirely; nothing from it reaches the predicate.
//
// Only read_at and the legacy read flag are written. The database grant to
// `authenticated` is column-limited to (read, read_at) as a second barrier.
//
// Note: admin-scope broadcast rows (recipient_id NULL) are shared across all
// active admins by design, so clearing them clears them for every admin. That
// is the N2 behaviour agreed in the lockdown audit; per-admin read state would
// need a separate notification_reads table.
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

export async function POST() {
  try {
    const resolved = await resolveCaller()
    if (!resolved.ok) return resolved.response

    const { caller, adminClient } = resolved

    const { data: updatedRows, error } = await scoped(
      adminClient.from('notifications').update({
        read_at: new Date().toISOString(),
        read: true,
      }),
      caller,
    )
      .is('read_at', null)
      .select('id')

    if (error) {
      console.error('❌ Failed to mark all notifications read:', error)
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: updatedRows?.length ?? 0 })
  } catch (error) {
    console.error('❌ Mark-all-read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
