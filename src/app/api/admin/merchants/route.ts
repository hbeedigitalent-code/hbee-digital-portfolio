// src/app/api/admin/merchants/route.ts
//
// GET — the merchant account list for src/app/admin/merchants/page.tsx.
//
// Replaces that page's direct `merchant_accounts` query, which ran as the
// caller's `authenticated` role outside the admin 2FA check. The page derives
// its total/pending/active tiles from the same rows, so the counts are computed
// here and returned alongside rather than being recomputed in the browser from
// a partial list.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure } from '@/lib/admin-api-auth'

// The confirmed merchant_accounts columns, enumerated rather than `*` so a
// column added to the table later is not published by accident.
//
// `phone` and `website` used to appear here. Those are columns of the separate
// `merchants` table (the assessment record), NOT of merchant_accounts, which
// names the same ideas `whatsapp` and `website_url`. PostgREST rejected the
// whole SELECT with 42703, so the list endpoint returned a generic 500 while
// every other converted page worked.
const MERCHANT_ACCOUNT_COLUMNS =
  'id, business_name, contact_name, email, whatsapp, website_url, country, ' +
  'industry, status, email_verified, created_at, updated_at'

export async function GET() {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { db } = auth

    const { data, error } = await db
      .from('merchant_accounts')
      .select(MERCHANT_ACCOUNT_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) return queryFailure('merchant account list', error)

    const rows = data || []
    return NextResponse.json({
      merchants: rows,
      stats: {
        total: rows.length,
        pending: rows.filter((m: any) => m.status === 'pending').length,
        active: rows.filter((m: any) => m.status === 'active').length,
      },
    })
  } catch (error) {
    console.error('[admin-api] merchant account list error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
