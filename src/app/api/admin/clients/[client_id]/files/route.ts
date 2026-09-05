// src/app/api/admin/clients/[client_id]/files/route.ts
//
// Lists project_files metadata (never file_url / signed URLs / content) for
// ONE client, across all of that client's projects AND their General
// (project_id = NULL) uploads. This is the client-level counterpart to
// /api/admin/projects/[project_id]/files — the client upload flow scopes
// files by client_id and only sometimes sets project_id, so the admin needs
// a client-level view to see everything a client has sent.
//
// Not covered by middleware.ts (its matcher is /admin/:path* and
// /client-portal/:path*, not /api/admin/:path*), so session, 2FA, and
// active-admin are all re-verified here independently, in the same order
// middleware uses for /admin/* pages.
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

export async function GET(request: Request, { params }: { params: { client_id: string } }) {
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
    // uses, no duplicated HMAC logic. verifyAdmin2FACookie() checks the
    // payload's uid against `user.id` itself. Checked BEFORE any
    // admin_users / service-role query. A missing/invalid/mismatched cookie
    // gets the same generic 401 as "no session".
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

    // 6. The client must exist.
    const { data: clientRow } = await adminClient
      .from('clients')
      .select('id')
      .eq('id', params.client_id)
      .maybeSingle()

    if (!clientRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 7. Metadata only — file_url is excluded from the select() itself, not
    // just from the response mapping, so it is never pulled from the
    // database for this route.
    const { data: fileRows, error: filesError } = await adminClient
      .from('project_files')
      .select('id, project_id, client_id, file_name, file_type, file_size, category, uploaded_by, uploaded_at')
      .eq('client_id', params.client_id)
      .order('uploaded_at', { ascending: false })

    if (filesError) {
      console.error('❌ Failed to list client files:', filesError)
      return NextResponse.json({ error: 'Failed to load files' }, { status: 500 })
    }

    // 8-9. Resolve project names for the rows that have a project_id. Rows
    // with a NULL project_id are surfaced as "General" by the client (the
    // API returns project_id: null and project_name: null).
    const { data: projectRows } = await adminClient
      .from('projects')
      .select('id, project_name, project_id')
      .eq('client_id', params.client_id)

    const projectNameById = new Map<string, string | null>(
      (projectRows || []).map((p: any) => [p.id, p.project_name || p.project_id || null]),
    )

    const files = (fileRows || []).map((f: any) => ({
      ...f,
      project_name: f.project_id ? projectNameById.get(f.project_id) ?? null : null,
    }))

    return NextResponse.json({ files })
  } catch (error: any) {
    console.error('Admin client file list route error:', error)
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 })
  }
}
