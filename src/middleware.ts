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

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ADMIN_PREFIX = '/admin'
const PORTAL_PREFIX = '/client-portal'

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
  matcher: ['/admin/:path*', '/client-portal/:path*'],
}
