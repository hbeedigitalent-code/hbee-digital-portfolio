// src/app/api/notifications/unread-count/route.ts
//
// GET — returns the unread notification count for the authenticated caller.
// This is the endpoint the notification bells will poll (bells are NOT built in
// this batch).
//
// Batch N2-C. The scope is derived entirely from WHO THE CALLER IS: an active
// admin counts recipient_scope = 'admin' rows; anyone else is resolved to their
// own clients.id and counts recipient_scope = 'client' AND recipient_id = that
// id. Nothing in the query string contributes to the predicate.
//
// Not covered by middleware.ts (its matcher is /admin/:path*,
// /admin-2fa-challenge and /client-portal/:path*, not /api/*), so session, 2FA
// and active-admin are all verified here independently.
//
// The service-role client is used only AFTER authorization, and the query
// carries the caller-derived predicate explicitly. The recipient-scoped RLS
// policies on public.notifications remain the final defense.

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

export async function GET() {
  try {
    const resolved = await resolveCaller()
    if (!resolved.ok) return resolved.response

    const { caller, adminClient } = resolved

    // read_at IS NULL is the single source of truth for "unread".
    const { count, error } = await scoped(
      adminClient.from('notifications').select('id', { count: 'exact', head: true }),
      caller,
    ).is('read_at', null)

    if (error) {
      console.error('❌ Failed to count unread notifications:', error)
      return NextResponse.json({ error: 'Failed to load unread count' }, { status: 500 })
    }

    return NextResponse.json({ unreadCount: count || 0 })
  } catch (error) {
    console.error('❌ Unread count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
