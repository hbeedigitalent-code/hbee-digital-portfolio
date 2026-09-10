// src/app/api/account/provision/route.ts
//
// POST — provision the CALLER'S OWN client and merchant records.
//
// Signup itself cannot do this: supabase.auth.signUp() with email confirmation
// enabled returns no session, so there is no verified identity yet. This
// endpoint is the browser-facing half of provisioning, called from the
// confirmation page once a session exists. The server-side half runs inside
// /api/auth/confirm. Both call the same idempotent function.
//
// ORDINARY CLIENT SIGNUP — NO ADMIN 2FA. This deliberately does NOT use
// requireActiveAdmin(): a client confirming their email is not an admin and
// must not be asked for an admin 2FA cookie. The only gate is a valid session.
//
// THE REQUEST BODY IS NOT READ AT ALL. There is no parameter to send. The
// account is identified solely by auth.getUser(), and every profile value comes
// from the verified auth record's own metadata. A caller therefore cannot
// provision another user's account, set email_verified, set an account status,
// attach a merchant link, or write any approval field — there is no input
// channel for any of it.
//
// Not covered by middleware.ts, whose matcher is /admin/:path*,
// /admin-2fa-challenge and /client-portal/:path* — not /api/*. The session is
// therefore verified here independently.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { provisionAccount } from '@/lib/provision-account'

export async function POST() {
  try {
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const result = await provisionAccount({
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      user_metadata: user.user_metadata,
    })

    if (!result.ok) {
      // A PARTIAL failure is reported as a failure. The previous browser code
      // logged the error and returned success, which is how signup could report
      // "Account Created" with no merchant record behind it.
      console.error(
        `[api/account/provision] incomplete for user ${user.id} ` +
          `(client=${result.client}, merchant=${result.merchant}, reason=${result.reason})`,
      )
      return NextResponse.json(
        {
          error: 'Your account was not fully set up. Please try again or contact support.',
          client: result.client,
          merchant: result.merchant,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      client: result.client,
      merchant: result.merchant,
    })
  } catch (error) {
    console.error('[api/account/provision] error:', error)
    return NextResponse.json({ error: 'Failed to set up your account' }, { status: 500 })
  }
}
