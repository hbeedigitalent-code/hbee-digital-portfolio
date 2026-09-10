// src/app/api/admin/clients/route.ts
//
// GET — the admin client list, in one of three FIXED shapes.
//
// Replaces the direct browser `clients` queries in
// src/app/admin/client-health/page.tsx, src/app/admin/client-portal/page.tsx
// and src/app/admin/projects/new/page.tsx.
//
// Those reads previously relied on `clients` being readable by any
// authenticated user. The lockdown migration leaves `clients` with an own-row
// SELECT policy ONLY — there is deliberately no admin policy, because a
// database policy cannot see the admin 2FA cookie. Admin access to other
// people's client records therefore has to come through here.
//
// `view` selects between three hard-coded column shapes. It is an enum, not a
// column list: the caller cannot name a table, a column, or a filter, so this
// is not a general-purpose query endpoint.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure } from '@/lib/admin-api-auth'

// Health board: the client plus its projects' progress fields.
const HEALTH_COLUMNS = `
  id, full_name, business_name, email,
  projects (id, project_id, project_name, status, progress)
`

// Client-portal admin list: account fields plus a project summary.
// Enumerated rather than `*` so a column added to clients later — including any
// future trusted field — is not published by accident.
const PORTAL_COLUMNS = `
  id, user_id, full_name, business_name, email, whatsapp, website_url, country,
  status, profile_image, created_at, updated_at,
  merchant_id, growth_profile_id, hgri_score, growth_classification,
  projects (id, project_id, status)
`

// Selector for the "assign a client" dropdown on project creation.
const OPTION_COLUMNS = 'id, full_name, business_name, email'

const VIEWS: Record<string, { columns: string; orderBy: string; ascending: boolean }> = {
  health: { columns: HEALTH_COLUMNS, orderBy: 'business_name', ascending: true },
  portal: { columns: PORTAL_COLUMNS, orderBy: 'created_at', ascending: false },
  options: { columns: OPTION_COLUMNS, orderBy: 'business_name', ascending: true },
}

export async function GET(request: Request) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { db } = auth

    const view = new URL(request.url).searchParams.get('view') || 'options'
    const shape = VIEWS[view]
    if (!shape) {
      return NextResponse.json({ error: 'Unsupported view' }, { status: 400 })
    }

    const { data, error } = await db
      .from('clients')
      .select(shape.columns)
      .order(shape.orderBy, { ascending: shape.ascending })
      .limit(1000)

    if (error) return queryFailure(`client list (${view})`, error)

    return NextResponse.json({ clients: data || [] })
  } catch (error) {
    console.error('[admin-api] client list error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
