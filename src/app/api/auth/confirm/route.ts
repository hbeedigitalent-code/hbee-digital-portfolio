// src/app/api/auth/confirm/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { provisionAccount } from '@/lib/provision-account'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * A FRESH client per request.
 *
 * This module used to hold one shared client at module scope. verifyOtp()
 * stores the verified session on the client instance it is called on, so a
 * module-level singleton in a server route carried one visitor's session into
 * the next request handled by the same warm instance. Each confirmation now
 * gets its own client, which is discarded when the request ends.
 */
function createConfirmationClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')
  const type = searchParams.get('type')
  const redirectTo = searchParams.get('redirect_to') || '/client-confirmation'

  if (!token) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/client-confirmation?error=missing_token`
    )
  }

  try {
    // Verify the token with Supabase
    const supabase = createConfirmationClient()
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type === 'recovery' ? 'recovery' : 'signup',
    })

    if (error) {
      console.error('Confirmation error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/client-confirmation?error=verification_failed`
      )
    }

    if (data.user) {
      // Provisioning runs here because THIS is where a verified identity first
      // exists. It replaces the anonymous clients insert that used to live in
      // this block: that ran with no session, so auth.uid() was null and the
      // own-row insert policy could never have matched it after the lockdown.
      //
      // provisionAccount() is idempotent — reopening a confirmation link, or
      // the confirmation page also calling /api/account/provision, creates
      // nothing twice and overwrites no existing record. Identity comes from
      // the verified auth user, never from the query string.
      const provisioning = await provisionAccount({
        id: data.user.id,
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
        user_metadata: data.user.user_metadata,
      })

      if (!provisioning.ok) {
        // The email IS confirmed at this point — that part succeeded and must
        // not be reported as a failure. But provisioning did not complete, so
        // the confirmation page is told so explicitly rather than showing an
        // unqualified success. It offers a retry, which is safe to take.
        console.error(
          `[api/auth/confirm] provisioning incomplete for user ${data.user.id} ` +
            `(client=${provisioning.client}, merchant=${provisioning.merchant}, ` +
            `reason=${provisioning.reason})`,
        )
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_SITE_URL}${redirectTo}?confirmed=true&setup=incomplete`
        )
      }

      // User is confirmed - redirect to confirmation page with success
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}${redirectTo}?confirmed=true`
      )
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/client-confirmation?error=unknown`
    )
  } catch (error) {
    console.error('Confirmation error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/client-confirmation?error=server_error`
    )
  }
}