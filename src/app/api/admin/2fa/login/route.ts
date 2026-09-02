// src/app/api/admin/2fa/login/route.ts
import { NextResponse } from 'next/server'
import speakeasy from 'speakeasy'

// Lazy initialize Supabase clients - only when needed
let supabaseAdmin: any = null
let supabaseAnon: any = null

function getSupabaseClients() {
  if (supabaseAdmin && supabaseAnon) {
    return { supabaseAdmin, supabaseAnon }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  }

  // Dynamic import to avoid build-time issues
  const { createClient } = require('@supabase/supabase-js')

  if (supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  if (supabaseAnonKey) {
    supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return { supabaseAdmin, supabaseAnon }
}

export async function POST(request: Request) {
  try {
    const { userId, token } = await request.json()

    if (!userId || !token) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or token' },
        { status: 400 }
      )
    }

    console.log('🔍 2FA Login attempt for userId:', userId)

    const { supabaseAdmin: adminClient } = getSupabaseClients()

    if (!adminClient) {
      console.error('❌ Supabase service-role client not available')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // 1. Get user's 2FA secret — read with the SERVICE-ROLE client only.
    //    The TOTP secret / backup codes must never be reachable via the
    //    public anon client (admin_2fa is locked down by RLS).
    const { data: twoFAData, error: twoFAError } = await adminClient
      .from('admin_2fa')
      .select('secret, is_enabled')
      .eq('user_id', userId)
      .single()

    if (twoFAError || !twoFAData) {
      console.error('❌ 2FA data error:', twoFAError)
      return NextResponse.json(
        { success: false, error: '2FA not setup' },
        { status: 400 }
      )
    }

    if (!twoFAData.is_enabled) {
      console.error('❌ 2FA not enabled')
      return NextResponse.json(
        { success: false, error: '2FA not enabled' },
        { status: 400 }
      )
    }

    // 2. Verify token
    const verified = speakeasy.totp.verify({
      secret: twoFAData.secret,
      encoding: 'base32',
      token: token,
      window: 1
    })

    if (!verified) {
      console.error('❌ Invalid 2FA code')
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    console.log('✅ 2FA verified for userId:', userId)

    // 3. CHECK IF USER IS ADMIN - USING SERVICE ROLE (BYPASSES RLS)
    if (!adminClient) {
      console.error('❌ Supabase admin client not available')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { data: adminData, error: adminError } = await adminClient
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (adminError) {
      console.error('❌ Admin check error:', adminError)
    }

    if (!adminData) {
      console.error('❌ User is NOT admin - userId:', userId)
      return NextResponse.json(
        { success: false, error: 'User is not authorized as admin' },
        { status: 403 }
      )
    }

    console.log('✅ Admin verified:', adminData.email)

    // ✅ USER IS ADMIN - ALLOW ACCESS
    return NextResponse.json({
      success: true,
      admin: adminData
    })
  } catch (error: any) {
    console.error('Login verify error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed' },
      { status: 500 }
    )
  }
}