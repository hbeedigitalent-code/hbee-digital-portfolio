// src/app/api/admin/2fa/login/route.ts
//
// Verifies the TOTP code submitted on the /admin/2fa-challenge form and, on
// success, issues the signed "2FA verified" cookie middleware checks on every
// subsequent /admin/* request.
//
// The acting user is derived from the caller's own Supabase session cookies —
// never from a body field. A request with no valid session is rejected before
// any admin_2fa row is ever read.
import { NextResponse } from 'next/server'
import speakeasy from 'speakeasy'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAdmin2FACookieOptions, ADMIN_2FA_COOKIE_NAME, signAdmin2FACookie } from '@/lib/admin-2fa-cookie'

// Lazy, non-throwing service-role client. Deliberately not the shared
// src/lib/supabaseAdmin.ts singleton, which throws at import time when
// SUPABASE_SERVICE_ROLE_KEY is missing — that would crash this whole route
// instead of returning a clean "Server configuration error" response.
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

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing verification code' },
        { status: 400 },
      )
    }

    // 1. Who is actually calling — from the session, not the request body.
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      )
    }

    const adminClient = getServiceRoleClient()
    if (!adminClient) {
      console.error('❌ Supabase service-role client not available')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 },
      )
    }

    // 2. Confirm the caller is an active admin — service role bypasses RLS.
    const { data: adminData, error: adminError } = await adminClient
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (adminError) {
      console.error('❌ Admin check error:', adminError)
    }

    if (!adminData) {
      return NextResponse.json(
        { success: false, error: 'User is not authorized as admin' },
        { status: 403 },
      )
    }

    // 3. Get the 2FA secret for THIS session's user — service-role only.
    //    The secret / backup codes never leave this route.
    const { data: twoFAData, error: twoFAError } = await adminClient
      .from('admin_2fa')
      .select('secret, is_enabled')
      .eq('user_id', user.id)
      .maybeSingle()

    if (twoFAError || !twoFAData) {
      return NextResponse.json(
        { success: false, error: '2FA not set up' },
        { status: 400 },
      )
    }

    if (!twoFAData.is_enabled) {
      return NextResponse.json(
        { success: false, error: '2FA is not enabled for this account' },
        { status: 400 },
      )
    }

    // 4. Verify the TOTP code.
    const verified = speakeasy.totp.verify({
      secret: twoFAData.secret,
      encoding: 'base32',
      token,
      window: 1,
    })

    if (!verified) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 },
      )
    }

    // 5. Mint the verification cookie. Fail closed if the secret is missing —
    //    never respond success without actually being able to issue a cookie.
    const cookieValue = await signAdmin2FACookie(user.id)
    if (!cookieValue) {
      console.error('❌ ADMIN_2FA_COOKIE_SECRET is not set — cannot complete 2FA verification')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 },
      )
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(ADMIN_2FA_COOKIE_NAME, cookieValue, getAdmin2FACookieOptions())
    return response
  } catch (error: any) {
    console.error('2FA login verify error:', error)
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 },
    )
  }
}
