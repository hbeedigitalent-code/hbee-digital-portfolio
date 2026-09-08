// src/app/api/admin/projects/route.ts
//
// Creates ONE client project on behalf of an authenticated, 2FA-verified,
// active admin, generating the project_id reference server-side.
//
// Until now there was no admin project-creation path at all: every "New
// Project" button linked to /admin/projects/new, which had no page, so the
// URL fell through to /admin/projects/[project_id] with project_id = "new".
// That page cast "new" to a uuid, Postgres rejected it with 22P02, and the
// catch-all error branch silently redirected back to the list. This route plus
// the new page replace that dead end.
//
// Not covered by middleware.ts (its matcher is /admin/:path*,
// /admin-2fa-challenge and /client-portal/:path*, not /api/admin/:path*), so
// session, 2FA and active-admin are all re-verified here independently.
//
// Nothing about identity or state is taken from the request: status is forced
// to 'Pending Review', progress to 0, and project_id is generated here. Any
// client-supplied project_id, status, progress or created_by is ignored.
//
// The `projects` table is shared with the public portfolio side, whose `title`
// column is NOT NULL, while the client portal reads `project_name`. Both are
// written with the same value — exactly what the known-good client flow in
// src/components/client-portal/ProjectRequestForm.tsx does.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomInt } from 'crypto'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'

// Lazy, non-throwing service-role client — the same defensive pattern used by
// the other /api/admin routes. Deliberately NOT the shared
// src/lib/supabaseAdmin.ts singleton, which throws at import time when
// SUPABASE_SERVICE_ROLE_KEY is missing.
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_PROJECT_ID_ATTEMPTS = 5

// Same PROJ-###### shape ProjectRequestForm.tsx uses, but the suffix comes from
// a CSPRNG instead of Date.now().slice(-6): two projects created in the same
// millisecond would otherwise collide. Uniqueness is still pre-checked below.
function buildProjectReference(): string {
  return `PROJ-${String(randomInt(0, 1_000_000)).padStart(6, '0')}`
}

export async function POST(request: Request) {
  try {
    // 1. Derive the caller from THEIR OWN session — never a client-supplied
    //    id/email/role/isAdmin flag of any kind.
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 2. Verify the signed 2FA attestation cookie — the same function
    //    middleware uses, checked BEFORE any admin_users / service-role query.
    //    A missing, invalid or mismatched cookie gets the same generic 401.
    const cookieValue = cookies().get(ADMIN_2FA_COOKIE_NAME)?.value
    const twoFAVerified = await verifyAdmin2FACookie(cookieValue, user.id)
    if (!twoFAVerified) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = getServiceRoleClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 3. Active-admin status, verified server-side via the service-role
    //    client — never trusted from the browser.
    const { data: adminRow } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!adminRow) {
      return NextResponse.json({ error: 'Not authorized as admin' }, { status: 403 })
    }

    // 4. Validate the payload.
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const clientId = typeof body.client_id === 'string' ? body.client_id.trim() : ''
    const projectName = typeof body.project_name === 'string' ? body.project_name.trim() : ''
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : projectName

    if (!UUID_RE.test(clientId)) {
      return NextResponse.json({ error: 'A valid client is required' }, { status: 400 })
    }
    if (!projectName) {
      return NextResponse.json({ error: 'A project name is required' }, { status: 400 })
    }

    // 5. The selected client must actually exist — validated here rather than
    //    assumed from the request.
    const { data: clientRow } = await adminClient
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .maybeSingle()

    if (!clientRow) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // 6. Only columns evidenced by the existing schema are written. `created_by`
    //    appears on no Project interface in the repo, so no creator column is
    //    set and no migration is implied.
    const basePayload: Record<string, any> = {
      client_id: clientId,
      title,
      project_name: projectName,
      status: 'Pending Review',
      progress: 0,
      description: typeof body.description === 'string' ? body.description.trim() : '',
      service_selected:
        typeof body.service_selected === 'string' ? body.service_selected.trim() : '',
      start_date: body.start_date
        ? new Date(body.start_date).toISOString()
        : new Date().toISOString(),
    }

    // 7. Insert with a server-generated project reference. The reference is
    //    pre-checked for collisions; a 23505 between the check and the insert
    //    triggers a bounded retry with a fresh reference.
    let project: any = null
    let insertError: any = null

    for (let attempt = 0; attempt < MAX_PROJECT_ID_ATTEMPTS; attempt++) {
      const candidate = buildProjectReference()

      const { data: clash, error: clashError } = await adminClient
        .from('projects')
        .select('id')
        .eq('project_id', candidate)
        .maybeSingle()

      if (clashError) {
        console.error('❌ project_id uniqueness check failed:', clashError)
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
      }
      if (clash) continue

      const { data, error } = await adminClient
        .from('projects')
        .insert({ ...basePayload, project_id: candidate })
        .select()
        .single()

      if (!error && data) {
        project = data
        break
      }

      insertError = error
      // 23505 = unique_violation: another request claimed this reference
      // between the check and the insert. Anything else is fatal.
      if (error?.code !== '23505') break
    }

    if (!project) {
      console.error('❌ Failed to create project:', insertError)
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
    }

    // Client notification is deliberately DEFERRED to a later batch: this one
    // must not touch notification behaviour. Wiring it later is a single
    // createNotification({ scope: 'client', recipientId: clientId, ... }) call.

    return NextResponse.json({ success: true, project })
  } catch (error) {
    console.error('❌ Project creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
