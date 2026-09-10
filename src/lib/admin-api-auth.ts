// src/lib/admin-api-auth.ts
//
// SERVER-ONLY. The single admin gate for /api/admin/* route handlers.
//
// middleware.ts protects /admin/:path* pages but its matcher does not cover
// /api/*, so every admin route must verify independently. This module is the
// one implementation of that check, so the ordering below cannot drift between
// routes:
//
//   1. Session          -> 401
//   2. User-bound 2FA   -> 401 (the SAME generic message, checked BEFORE any
//                               admin_users query, so a missing cookie is
//                               indistinguishable from a missing session)
//   3. Privileged client-> 500
//   4. Active admin row -> 403 (a lookup ERROR is also 403 — a check that
//                               cannot answer "yes" is never read as "yes")
//
// The privileged client this returns is Supabase's service role. It exists so
// routes can read tables that ordinary roles are denied AFTER the caller has
// been proven to be an active, 2FA-verified admin. It must never be handed a
// table name, column list or filter that came from a request.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'

if (typeof window !== 'undefined') {
  throw new Error('admin-api-auth.ts is server-only and must not be imported by client code')
}

let privilegedClient: any = null

/**
 * Lazy, non-throwing service-role client. Deliberately NOT
 * src/lib/supabaseAdmin.ts, which throws at import time when the key is absent
 * and would take down the whole route module.
 */
export function getPrivilegedClient() {
  if (privilegedClient) return privilegedClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null

  const { createClient } = require('@supabase/supabase-js')
  privilegedClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return privilegedClient
}

export type AdminAuthResult =
  | { ok: true; db: any; userId: string }
  | { ok: false; response: NextResponse }

export async function requireActiveAdmin(): Promise<AdminAuthResult> {
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

  const cookieValue = cookies().get(ADMIN_2FA_COOKIE_NAME)?.value
  const twoFAVerified = await verifyAdmin2FACookie(cookieValue, user.id)
  if (!twoFAVerified) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  const db = getPrivilegedClient()
  if (!db) {
    console.error('[admin-api] privileged client unavailable')
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }),
    }
  }

  const { data: adminRow, error } = await db
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error(
      `[admin-api] admin membership lookup failed (code=${
        (error as { code?: string }).code ?? 'n/a'
      }) — denied`,
    )
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authorized' }, { status: 403 }),
    }
  }

  if (!adminRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authorized' }, { status: 403 }),
    }
  }

  return { ok: true, db, userId: user.id }
}

export const ADMIN_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Logs a failed query with its SQLSTATE and returns a generic 500. Callers
 * surface this to the admin UI as an explicit error, never as an empty list —
 * a denied or failed read must not look like "no records".
 */
export function queryFailure(context: string, error: unknown): NextResponse {
  console.error(
    `[admin-api] ${context} failed (code=${
      (error as { code?: string })?.code ?? 'n/a'
    })`,
  )
  return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
}
