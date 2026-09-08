// src/app/api/notifications/route.ts
//
// GET — lists the authenticated caller's notifications plus their unread count.
//
// Batch N2-C. The scope is derived entirely from WHO THE CALLER IS: an active
// admin gets recipient_scope = 'admin' rows; anyone else is resolved to their
// own clients.id and gets recipient_scope = 'client' AND recipient_id = that id.
// Nothing in the query string or body contributes to the predicate — a caller
// cannot ask for another scope, another client, or another user's rows.
//
// Legacy pre-N0 rows (recipient_id NULL, is_legacy true) are excluded naturally:
// they match no client's recipient_id and carry recipient_scope 'client', so no
// admin sees them either.
//
// Not covered by middleware.ts (its matcher is /admin/:path*,
// /admin-2fa-challenge and /client-portal/:path*, not /api/*), so session, 2FA
// and active-admin are all verified here independently.
//
// The service-role client is used only AFTER authorization, and every query
// carries the caller-derived predicate explicitly. The four recipient-scoped
// RLS policies on public.notifications remain the final defense for any other
// access path.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'

// Lazy, non-throwing service-role client — the same defensive pattern used by
// the /api/admin routes. Deliberately NOT the shared src/lib/supabaseAdmin.ts
// singleton, which throws at import time when SUPABASE_SERVICE_ROLE_KEY is
// missing and would crash the route instead of returning a clean JSON error.
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

const LIST_LIMIT = 50

// Only presentation fields leave the server. recipient_id, user_id, user_type,
// idempotency_key and is_legacy are internal and never exposed.
const NOTIFICATION_COLUMNS =
  'id, type, title, message, link, entity_type, entity_id, recipient_scope, created_at, read_at'

type Caller = { scope: 'admin' } | { scope: 'client'; clientId: string }

type CallerResult =
  | { ok: true; caller: Caller; adminClient: any }
  | { ok: false; response: NextResponse }

async function resolveCaller(): Promise<CallerResult> {
  // 1. Derive the caller from THEIR OWN session — never a client-supplied
  //    id/email/role/scope flag of any kind.
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

  // 2. Active-admin status, verified server-side. Admin takes precedence when a
  //    user somehow holds both roles.
  const { data: adminRow } = await adminClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (adminRow) {
    // 3. Admin-scope rows are never served or mutated without a valid signed
    //    2FA attestation — the same generic 401 every other admin API route
    //    returns for a missing/invalid/mismatched cookie.
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

  // 4. Not an admin — resolve this user's own clients.id server-side.
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

    const { data: rows, error: listError } = await scoped(
      adminClient.from('notifications').select(NOTIFICATION_COLUMNS),
      caller,
    )
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT)

    if (listError) {
      console.error('❌ Failed to list notifications:', listError)
      return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 })
    }

    // read_at IS NULL is the single source of truth for "unread"; the legacy
    // `read` boolean is written for compatibility but never queried.
    const { count, error: countError } = await scoped(
      adminClient.from('notifications').select('id', { count: 'exact', head: true }),
      caller,
    ).is('read_at', null)

    if (countError) {
      console.error('❌ Failed to count unread notifications:', countError)
      return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 })
    }

    return NextResponse.json({
      notifications: rows || [],
      unreadCount: count || 0,
    })
  } catch (error) {
    console.error('❌ Notification list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
