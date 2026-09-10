// src/app/api/admin/growth-intelligence/route.ts
//
// GET — growth score rows plus their classification breakdown.
//
// Replaces the direct browser query in
// src/app/admin/growth-intelligence/page.tsx, which read growth_scores as the
// caller's `authenticated` role. The page computed its own tiles from the rows;
// the same counts are computed here so the numbers cannot drift from the list.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure } from '@/lib/admin-api-auth'

const SCORE_COLUMNS = `
  id, merchant_id, classification, hgri_score, created_at,
  visibility_score, conversion_score, retention_score, authority_score, scalability_score
`

export async function GET() {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { db } = auth

    const { data, error } = await db
      .from('growth_scores')
      .select(SCORE_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) return queryFailure('growth score list', error)

    const rows = data || []
    const count = (label: string) =>
      rows.filter((s: any) => s.classification === label).length

    return NextResponse.json({
      scores: rows,
      stats: {
        total: rows.length,
        foundation: count('Foundation Stage'),
        potential: count('Growth Potential'),
        ready: count('Growth Ready'),
        scale: count('Scale Ready'),
      },
    })
  } catch (error) {
    console.error('[admin-api] growth score list error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
