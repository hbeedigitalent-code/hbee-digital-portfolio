// src/app/api/admin/logout/route.ts
//
// Clears the httpOnly "2FA verified" cookie. This can only be done from a
// server response — client-side JS cannot delete an httpOnly cookie — so the
// admin layouts call this route as part of logging out, alongside their
// existing client-side supabase.auth.signOut().
import { NextResponse } from 'next/server'
import { ADMIN_2FA_COOKIE_NAME, getAdmin2FAClearCookieOptions } from '@/lib/admin-2fa-cookie'

export async function POST() {
  const response = NextResponse.json({ success: true })
  const clearOptions = getAdmin2FAClearCookieOptions()

  // Clear the current cookie (Path=/, per admin-2fa-cookie.ts).
  response.cookies.set(ADMIN_2FA_COOKIE_NAME, '', clearOptions)

  // Deployment-transition hardening: a browser that authenticated before
  // admin-2fa-cookie.ts moved from Path=/admin to Path=/ may still hold that
  // old-path cookie. A Set-Cookie only deletes a cookie whose Path matches
  // exactly, so clearing the new path alone would leave the stale one in
  // place indefinitely.
  //
  // NextResponse.cookies.set() keys entries by cookie NAME, so a second
  // set() of the same name would overwrite the line above rather than add a
  // second Set-Cookie. Serialize the legacy-path deletion on a throwaway
  // response (identical attribute formatting, path overridden) and append
  // it as its own header. No cookie-signing/verification logic touched.
  const legacyResponse = NextResponse.json(null)
  legacyResponse.cookies.set(ADMIN_2FA_COOKIE_NAME, '', { ...clearOptions, path: '/admin' })
  const legacySetCookie = legacyResponse.headers.get('set-cookie')
  if (legacySetCookie) {
    response.headers.append('set-cookie', legacySetCookie)
  }

  return response
}
