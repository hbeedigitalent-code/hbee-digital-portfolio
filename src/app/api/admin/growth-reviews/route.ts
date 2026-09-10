// src/app/api/admin/growth-reviews/route.ts
//
// GET — the growth review queue, for active 2FA-verified admins only.
//
// Replaces the direct browser query in src/app/admin/growth-reviews/page.tsx
// and src/app/admin/growth-assessments/page.tsx, both of which read
// growth_reviews (embedding merchants and growth_assessments) as the caller's
// `authenticated` role. Once RLS is enabled on growth_reviews those reads stop
// working, and more importantly they were never gated on the admin 2FA cookie,
// which only the application server can verify.
//
// The only request input is an optional `status` filter, checked against a
// fixed list. No table name, column list or arbitrary filter is accepted.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure } from '@/lib/admin-api-auth'

// Statuses that exist in growth_reviews today.
const ALLOWED_STATUS_FILTERS = ['pending', 'in_progress', 'completed']

// Embedded shapes mirror what the two list pages render. Kept explicit rather
// than `*` so a column added later is not published by accident.
const LIST_COLUMNS = `
  id, status, created_at, updated_at, completed_at,
  hgri_score, growth_classification, merchant_id, assessment_id,
  merchant:merchants(id, business_name, contact_name, email, website, industry, country),
  assessment:growth_assessments(id, hgri_score, classification, growth_classification,
                                status, review_status, created_at,
                                visibility_score, conversion_score, retention_score,
                                authority_score, scalability_score)
`

export async function GET(request: Request) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { db } = auth

    const url = new URL(request.url)
    const statusParam = url.searchParams.get('status')

    let query = db
      .from('growth_reviews')
      .select(LIST_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(500)

    if (statusParam && statusParam !== 'all') {
      if (!ALLOWED_STATUS_FILTERS.includes(statusParam)) {
        return NextResponse.json({ error: 'Unsupported status filter' }, { status: 400 })
      }
      query = query.eq('status', statusParam)
    }

    const { data, error } = await query
    if (error) return queryFailure('growth review list', error)

    return NextResponse.json({ reviews: data || [] })
  } catch (error) {
    console.error('[admin-api] growth review list error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
