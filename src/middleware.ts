// src/middleware.ts
//
// Server-side route protection for /admin/* and /client-portal/*.
//
// This is the authoritative access boundary — it runs before any of those
// pages/layouts render, so the page bundles + data are never served to an
// unauthenticated (or wrong-role) visitor. The existing client-side gates in
// the two layouts remain in place as a second layer.
//
// Role is resolved through the existing tables:
//   - admin  → a row in `admin_users` (user_id = auth uid, is_active = true)
//   - client → a row in `clients`     (user_id = auth uid)
// No hardcoded emails, no service-role key here — only the already-public anon
// key plus the visitor's own session cookie.
//
// Admin routes carry a third layer: a signed, httpOnly "2FA verified" cookie
// (src/lib/admin-2fa-cookie.ts) is required for every /admin/* route except
// /admin/login and /admin-2fa-challenge. Verifying that cookie here is pure
// HMAC signature/expiry checking — still no service-role key. Whether 2FA is
// required at all for a given admin, and issuing the cookie, happens only in
// /api/admin/2fa/status and /api/admin/2fa/login, which do hold the
// service-role key and are the only code that ever reads admin_2fa.
//
// /admin-2fa-challenge is deliberately a TOP-LEVEL route (not nested under
// /admin/) so it does not inherit the admin dashboard shell (sidebar/header/
// nav) from src/app/admin/layout.tsx — the challenge must render before that
// shell is ever shown. Because it lives outside the /admin/:path* matcher
// below, it is listed explicitly so this middleware still runs for it and
// still enforces Layers 1-2 (session + active admin) on it; only Layer 3 is
// skipped there.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'

const ADMIN_PREFIX = '/admin'
const PORTAL_PREFIX = '/client-portal'
// The 2FA challenge itself must stay reachable once Layers 1-2 pass — it is
// where an admin actually completes the check this middleware enforces.
const ADMIN_2FA_CHALLENGE_PATH = '/admin-2fa-challenge'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminArea = pathname.startsWith(ADMIN_PREFIX)
  const isPortalArea = pathname.startsWith(PORTAL_PREFIX)
  if (!isAdminArea && !isPortalArea) return NextResponse.next()

  // The admin login screen must stay reachable without a session.
  if (pathname === '/admin/login') return NextResponse.next()

  // A response we can attach refreshed auth cookies to.
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env is unavailable (e.g. mid-build) don't hard-fail the whole app.
  if (!supabaseUrl || !supabaseAnonKey) return response

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request: { headers: request.headers } })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  const redirect = (to: string) => {
    const url = request.nextUrl.clone()
    url.pathname = to
    url.search = ''
    return NextResponse.redirect(url)
  }

  const loginPath = isAdminArea ? '/admin/login' : '/client-login'

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Layer 1 — must be authenticated.
    if (!user) return redirect(loginPath)

    // Layer 2 — must hold the right role, resolved via the existing tables.
    if (isAdminArea) {
      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      // Redirect only on a definitive "not an admin". If the lookup itself
      // errors (e.g. an RLS/permissions gap) we fall through to the existing
      // client-side admin gate rather than risk locking out a real admin.
      if (!error && !data) return redirect('/client-portal')

      // Layer 3 — server-enforced 2FA. The challenge route itself is exempt
      // (it is where this check is satisfied); every other /admin/* route
      // requires a valid, signed, user-bound "2FA verified" cookie. This is
      // pure signature/expiry verification (see admin-2fa-cookie.ts) — no
      // service-role key and no admin_2fa read happens here. Whether 2FA is
      // even required for this admin is decided by /api/admin/2fa/status,
      // which is what the challenge route calls.
      if (pathname !== ADMIN_2FA_CHALLENGE_PATH) {
        const cookieValue = request.cookies.get(ADMIN_2FA_COOKIE_NAME)?.value
        const verified = await verifyAdmin2FACookie(cookieValue, user.id)

        if (!verified) {
          const url = request.nextUrl.clone()
          url.pathname = ADMIN_2FA_CHALLENGE_PATH
          url.search = ''
          url.searchParams.set('next', pathname)
          return NextResponse.redirect(url)
        }
      }
    } else if (isPortalArea) {
      const { data, error } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!error && !data) return redirect('/client-login')
    }

    return response
  } catch {
    // Auth verification itself failed — treat the protected route as closed.
    return redirect(loginPath)
  }
}

export const config = {
  matcher: ['/admin/:path*', '/admin-2fa-challenge', '/client-portal/:path*'],
}
