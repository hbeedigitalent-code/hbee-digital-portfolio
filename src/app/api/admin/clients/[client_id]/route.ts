// src/app/api/admin/clients/[client_id]/route.ts
//
// GET — one client record for the admin client-portal detail page.
//
// Replaces the direct browser query in
// src/app/admin/client-portal/[client_id]/page.tsx. `clients` keeps only an
// own-row SELECT policy after the lockdown, so an admin viewing somebody else's
// record must come through a route that can verify the 2FA cookie.
//
// A sibling route already exists at [client_id]/files/. This adds the record
// itself and touches nothing there.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'

// Enumerated, not `*`. The trusted linking fields ARE included — an admin is
// entitled to see them — but listing them explicitly means a future column is
// not exposed until someone decides it should be.
const CLIENT_COLUMNS = `
  id, user_id, full_name, business_name, email, whatsapp, website_url, country,
  status, profile_image, created_at, updated_at,
  merchant_id, growth_profile_id, hgri_score, growth_classification,
  email_notifications, project_updates, marketing_emails
`

export async function GET(
  _request: Request,
  { params }: { params: { client_id: string } },
) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { db } = auth

    const clientId = typeof params?.client_id === 'string' ? params.client_id.trim() : ''
    if (!ADMIN_UUID_RE.test(clientId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data, error } = await db
      .from('clients')
      .select(CLIENT_COLUMNS)
      .eq('id', clientId)
      .maybeSingle()

    if (error) return queryFailure('client detail', error)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ client: data })
  } catch (error) {
    console.error('[admin-api] client detail error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
