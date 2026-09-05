// src/app/api/admin/2fa/disable/route.ts
//
// Disables 2FA for the CURRENT session's user. Previously this write happened
// directly from the browser against a table admin_2fa is correctly locked
// down against (RLS denies it), so "Disable 2FA" silently failed. This route
// performs the same update with the service-role client, scoped to the
// session-derived user id — never a browser-supplied one.
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Lazy, non-throwing service-role client — see login/route.ts for why this
// does not import the shared src/lib/supabaseAdmin.ts singleton.
let supabaseClient: any = null

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase environment variables not available')
    return null
  }

  const { createClient } = require('@supabase/supabase-js')
  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabaseClient
}

export async function POST() {
  try {
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

    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 },
      )
    }

    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!adminRow) {
      return NextResponse.json(
        { success: false, error: 'User is not authorized as admin' },
        { status: 403 },
      )
    }

    const { error } = await supabase
      .from('admin_2fa')
      .update({ is_enabled: false, secret: null, backup_codes: null })
      .eq('user_id', user.id)

    if (error) {
      console.error('Disable 2FA error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Disable 2FA error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to disable 2FA' },
      { status: 500 },
    )
  }
}
