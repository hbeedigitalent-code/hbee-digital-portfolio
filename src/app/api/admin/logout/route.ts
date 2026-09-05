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
  response.cookies.set(ADMIN_2FA_COOKIE_NAME, '', getAdmin2FAClearCookieOptions())
  return response
}
