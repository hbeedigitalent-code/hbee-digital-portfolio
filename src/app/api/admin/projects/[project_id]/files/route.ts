// src/app/api/admin/projects/[project_id]/files/route.ts
//
// Lists project_files metadata (never file_url / signed URLs / content) for
// ONE project, to active admins only. project_files has RLS enabled with no
// policies at all (deny-all) — unlike every other admin page, which reads
// Supabase directly from the browser and relies on RLS, this list can only
// ever be served through a service-role-backed route like this one.
//
// This route is NOT covered by middleware.ts (its matcher is /admin/:path*
// and /client-portal/:path*, not /api/admin/:path*), so every layer
// middleware would otherwise provide — session, active-admin, 2FA — is
// re-verified here independently, in the same order middleware uses.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'

// Lazy, non-throwing service-role client — the same defensive pattern used
// throughout Batch 1A/1C. Deliberately NOT the shared
// src/lib/supabaseAdmin.ts singleton, which throws at import time when
// SUPABASE_SERVICE_ROLE_KEY is missing and would crash this whole route
// instead of returning a clean JSON error.
let serviceRoleClient: any = null

function getServiceRoleClient() {
  if (serviceRoleClient) return serviceRoleClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) return null

  const { createClient } = require('@supabase/supabase-js')
  serviceRoleClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return serviceRoleClient
}

export async function GET(request: Request, { params }: { params: { project_id: string } }) {
  try {
    // 1-2. Derive the caller from THEIR OWN session — never a client-
    // supplied id/email/role/isAdmin flag of any kind.
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 3-4. Verify the existing signed 2FA cookie — same function middleware
    // uses, no duplicated HMAC logic. verifyAdmin2FACookie() itself checks
    // the payload's uid against `user.id`, so this single call covers both
    // "cookie is validly signed and unexpired" and "cookie belongs to this
    // session's user". Checked BEFORE any admin_users / service-role query,
    // per the required ordering. A missing/invalid/mismatched cookie gets
    // the same generic 401 as "no session" — never a distinct response that
    // would let a caller probe whether they merely failed 2FA vs. have no
    // session at all.
    const cookieValue = cookies().get(ADMIN_2FA_COOKIE_NAME)?.value
    const twoFAVerified = await verifyAdmin2FACookie(cookieValue, user.id)
    if (!twoFAVerified) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = getServiceRoleClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 5. Active-admin status, verified server-side via the service-role
    // client — never trusted from the browser.
    const { data: adminRow } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!adminRow) {
      return NextResponse.json({ error: 'Not authorized as admin' }, { status: 403 })
    }

    // 6-7. The project must exist. Read via service role since project_files
    // (queried next) has no policies at all; using the same client for both
    // reads keeps this route consistent rather than mixing session/service
    // clients mid-request.
    const { data: projectRow } = await adminClient
      .from('projects')
      .select('id')
      .eq('id', params.project_id)
      .maybeSingle()

    if (!projectRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 8-10. Metadata only — file_url is deliberately excluded from the
    // select() itself (not just from the response mapping), so it is never
    // even pulled out of the database for this route.
    const { data: fileRows, error: filesError } = await adminClient
      .from('project_files')
      .select('id, project_id, client_id, file_name, file_type, file_size, category, uploaded_by, uploaded_at')
      .eq('project_id', params.project_id)
      .order('uploaded_at', { ascending: false })

    if (filesError) {
      console.error('❌ Failed to list project files:', filesError)
      return NextResponse.json({ error: 'Failed to load files' }, { status: 500 })
    }

    // 11-12. No storage URLs, no file contents — metadata rows only.
    return NextResponse.json({ files: fileRows || [] })
  } catch (error: any) {
    console.error('Admin file list route error:', error)
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 })
  }
}
