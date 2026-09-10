// src/app/api/export/route.ts
//
// POST — export one supported table as CSV or JSON, for ACTIVE ADMINS ONLY.
//
// Before this change the route had no authentication of any kind, accepted an
// arbitrary caller-supplied table name, and passed it straight into
// `supabase.from(table).select('*')` on an anonymous client. Any unauthenticated
// caller could name any table and receive its full contents as a download, and
// raw PostgREST error text was echoed back on failure.
//
// Not covered by middleware.ts (its matcher is /admin/:path*,
// /admin-2fa-challenge and /client-portal/:path*, not /api/*), so session, 2FA
// and active-admin are verified here independently — the same pattern as
// /api/admin/proposals/[id]/status.
//
// TWO DIFFERENT DATABASE CLIENTS ARE USED HERE, DELIBERATELY:
//
//   1. Authorization  — the session client (identity) and a service-role client
//      used for exactly ONE query: the admin_users membership lookup.
//   2. Export data    — the pre-existing ANONYMOUS client from '@/lib/supabase',
//      unchanged.
//
// The export query is deliberately NOT switched to the service-role client.
// Doing so would silently widen which rows and columns the endpoint can return,
// because service-role bypasses RLS. That is a separate permissions decision,
// not part of closing this authorization hole. The consequence is that an
// authorized admin still sees only what the `anon` role is permitted to read —
// see the batch report.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'

// The ONLY exportable targets. Mirrors the ten tables the admin export page
// already offers. A caller-supplied value outside this list is rejected before
// any query runs, so no schema name, filter, column list or query expression
// can ever reach the database from the request.
const EXPORTABLE_TABLES = [
  'projects',
  'services',
  'faqs',
  'testimonials',
  'team_members',
  'blog_posts',
  'subscribers',
  'messages',
  'menu_items',
  'seo_settings',
] as const

type ExportableTable = (typeof EXPORTABLE_TABLES)[number]

const SUPPORTED_FORMATS = ['csv', 'json'] as const
type ExportFormat = (typeof SUPPORTED_FORMATS)[number]

function isExportableTable(value: unknown): value is ExportableTable {
  return (
    typeof value === 'string' &&
    (EXPORTABLE_TABLES as readonly string[]).includes(value)
  )
}

function isSupportedFormat(value: unknown): value is ExportFormat {
  return (
    typeof value === 'string' && (SUPPORTED_FORMATS as readonly string[]).includes(value)
  )
}

// Lazy, non-throwing service-role client — the same defensive pattern used by
// the other /api/admin routes. Deliberately NOT the shared
// src/lib/supabaseAdmin.ts singleton, which throws at import time when
// SUPABASE_SERVICE_ROLE_KEY is missing.
//
// Named for its single purpose: it is used ONLY for the admin_users membership
// lookup, never for the export query itself.
let authLookupClient: any = null

function getAuthLookupClient() {
  if (authLookupClient) return authLookupClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) return null

  const { createClient } = require('@supabase/supabase-js')
  authLookupClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return authLookupClient
}

type AuthResult = { ok: true } | { ok: false; response: NextResponse }

/**
 * Session + user-bound 2FA attestation + active admin_users membership.
 *
 * Fails closed at every step, including when the membership lookup itself
 * errors: an authenticated non-admin (a client-portal account, for instance)
 * and a failed lookup both end in 403, never in access.
 */
async function requireActiveAdmin(): Promise<AuthResult> {
  // 1. Identity comes from the caller's OWN session cookie — never from a
  //    body field, header or query parameter.
  const sessionClient = createServerSupabaseClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  // 2. Signed, user-bound, unexpired 2FA attestation. Checked BEFORE any
  //    admin_users query and returning the SAME generic 401 as a missing
  //    session, so a missing cookie is indistinguishable from no session.
  //    verifyAdmin2FACookie fails closed on a missing secret.
  const cookieValue = cookies().get(ADMIN_2FA_COOKIE_NAME)?.value
  const twoFAVerified = await verifyAdmin2FACookie(cookieValue, user.id)
  if (!twoFAVerified) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  // 3. Service-role client obtained only AFTER session + 2FA succeed, and used
  //    for the membership lookup alone.
  const adminClient = getAuthLookupClient()
  if (!adminClient) {
    console.error('[export] service-role client unavailable — export denied')
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }),
    }
  }

  // 4. Active admin membership, verified server-side. The lookup error is
  //    captured explicitly and treated as a denial: an authorization lookup
  //    that cannot answer "yes" must never be read as "yes".
  const { data: adminRow, error: adminLookupError } = await adminClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (adminLookupError) {
    console.error(
      `[export] admin membership lookup failed (code=${
        (adminLookupError as { code?: string }).code ?? 'n/a'
      }) — export denied`,
    )
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authorized' }, { status: 403 }),
    }
  }

  if (!adminRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authorized' }, { status: 403 }),
    }
  }

  return { ok: true }
}

export async function POST(request: Request) {
  try {
    // AUTHORIZATION FIRST — before the body is parsed, before the table name is
    // examined, and before any export query is issued.
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response

    // Malformed or absent JSON must not surface as an unhandled 500.
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const requestedTable = (body as { table?: unknown }).table
    if (!isExportableTable(requestedTable)) {
      // One generic message for missing, non-string and unsupported values, so
      // the endpoint cannot be used to probe which table names exist.
      return NextResponse.json({ error: 'Unsupported export table' }, { status: 400 })
    }
    const table: ExportableTable = requestedTable

    // Preserves the previous default of 'csv' when no format is supplied, but
    // an explicitly supplied unsupported value is now rejected rather than
    // silently falling through to the old "Invalid format" 400 at the end.
    const rawFormat = (body as { format?: unknown }).format
    if (rawFormat !== undefined && !isSupportedFormat(rawFormat)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }
    const format: ExportFormat = isSupportedFormat(rawFormat) ? rawFormat : 'csv'

    // Export data query — UNCHANGED anonymous client, as before this batch.
    // The dynamic import is retained from the original implementation.
    const { supabase } = await import('@/lib/supabase')

    const { data, error } = await supabase.from(table).select('*')

    if (error) {
      // Sanitized: the SQLSTATE is logged server-side, never returned. No
      // PostgREST message, schema detail, hint or row content leaves the server.
      console.error(
        `[export] query failed for table="${table}" (code=${
          (error as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Export failed' }, { status: 500 })
    }

    // `table` is allow-listed, so it is safe to interpolate into the filename
    // header — it can only ever be one of ten fixed lowercase identifiers.
    const filename = `${table}-export-${Date.now()}`

    if (format === 'csv') {
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'No data to export' }, { status: 404 })
      }

      const headers = Object.keys(data[0])
      const csvRows = [
        headers.join(','),
        ...data.map((row: Record<string, any>) =>
          headers
            .map((header) => {
              const value = row[header]
              if (
                typeof value === 'string' &&
                (value.includes(',') || value.includes('"') || value.includes('\n'))
              ) {
                return `"${value.replace(/"/g, '""')}"`
              }
              return value
            })
            .join(','),
        ),
      ]

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=${filename}.csv`,
        },
      })
    }

    // format === 'json' — the bulk export in the admin page reads this body
    // directly as the table's row array, so the shape is preserved. `?? []`
    // guards the null case so a caller never receives a bare `null`.
    return NextResponse.json(data ?? [], {
      headers: {
        'Content-Disposition': `attachment; filename=${filename}.json`,
      },
    })
  } catch (error) {
    // Nothing about the failure is returned to the caller.
    console.error('[export] unexpected error:', error instanceof Error ? error.name : 'unknown')
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
