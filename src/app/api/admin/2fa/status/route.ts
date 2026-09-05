// src/app/api/admin/2fa/status/route.ts
//
// Tells the caller whether TOTP verification is required, deriving the acting
// user from the current Supabase session — never from a browser-supplied id.
// This is the ONLY place besides /api/admin/2fa/login that reads
// admin_2fa.is_enabled, and it always does so with the service-role client.
// The browser never queries admin_2fa directly.
//
// When 2FA is NOT enabled for this admin, this route stamps the "2FA
// verified" cookie itself (there is nothing to verify, so the requirement is
// trivially satisfied) — this is the single, well-defined place that
// auto-stamps the cookie for a no-2FA admin; nothing else in the app does.
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAdmin2FACookieOptions, ADMIN_2FA_COOKIE_NAME, signAdmin2FACookie } from '@/lib/admin-2fa-cookie'

// Lazy, non-throwing service-role client — see login/route.ts for why this
// does not import the shared src/lib/supabaseAdmin.ts singleton.
let supabaseAdminClient: any = null

function getServiceRoleClient() {
  if (supabaseAdminClient) return supabaseAdminClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return null
  }

  const { createClient } = require('@supabase/supabase-js')
  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabaseAdminClient
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

    const { data: adminRow, error: adminError } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (adminError || !adminRow) {
      return NextResponse.json({ error: 'Not authorized as admin' }, { status: 403 })
    }

    const { data: twoFAData } = await adminClient
      .from('admin_2fa')
      .select('is_enabled')
      .eq('user_id', user.id)
      .maybeSingle()

    const enabled = Boolean(twoFAData?.is_enabled)

    if (!enabled) {
      // No 2FA configured — the "verified" requirement is trivially met.
      // Fail closed if the signing secret is missing: do NOT report ready
      // without actually being able to issue a valid cookie.
      const cookieValue = await signAdmin2FACookie(user.id)
      if (!cookieValue) {
        console.error('❌ ADMIN_2FA_COOKIE_SECRET is not set — cannot stamp verification state')
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 },
        )
      }

      const response = NextResponse.json({ enabled: false, ready: true })
      response.cookies.set(ADMIN_2FA_COOKIE_NAME, cookieValue, getAdmin2FACookieOptions())
      return response
    }

    return NextResponse.json({ enabled: true, ready: false })
  } catch (error: any) {
    console.error('2FA status error:', error)
    return NextResponse.json({ error: 'Failed to determine 2FA status' }, { status: 500 })
  }
}
