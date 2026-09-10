// src/app/api/admin/growth-reviews/[id]/route.ts
//
// GET   — one growth review with its merchant and assessment.
// PATCH — save review working fields (the "Save" action, not completion).
//
// Replaces the direct browser reads/writes in
// src/app/admin/growth-reviews/[id]/page.tsx and
// src/app/admin/growth-assessments/[id]/page.tsx.
//
// Completion stays where it is, at /api/growth-reviews/[id]/complete, which
// already carries the same gate. This route deliberately CANNOT set `status`
// or `completed_at`: promoting a review to completed generates a Growth Profile
// and must keep going through the single route that does it, rather than
// becoming reachable through a general-purpose field update.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'

const DETAIL_COLUMNS = `
  id, status, review_notes, created_at, updated_at, completed_at,
  hgri_score, growth_classification, strengths, opportunities,
  visibility_score, conversion_score, retention_score, authority_score, scalability_score,
  merchant_id, assessment_id,
  merchant:merchants(id, business_name, contact_name, email, website, industry, country,
                     business_stage, store_age),
  assessment:growth_assessments(*)
`

/** Bounded numeric score, or null when the caller sent nothing usable. */
function toScore(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.min(Math.max(Math.round(n), 0), 100)
}

function toStringList(value: unknown, max = 25, maxLen = 500): string[] | null {
  if (value === undefined) return null
  if (!Array.isArray(value)) return null
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((v) => v.slice(0, maxLen))
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { db } = auth

    const id = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!ADMIN_UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data, error } = await db
      .from('growth_reviews')
      .select(DETAIL_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (error) return queryFailure('growth review detail', error)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ review: data })
  } catch (error) {
    console.error('[admin-api] growth review detail error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { db } = auth

    const id = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!ADMIN_UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Explicit allow-list, rebuilt field by field. The request object is never
    // spread, so merchant_id, assessment_id, status and completed_at have no
    // path into the update.
    const updates: Record<string, any> = {}

    if (typeof body.review_notes === 'string') {
      updates.review_notes = body.review_notes.slice(0, 10000)
    }
    if (typeof body.growth_classification === 'string' && body.growth_classification.trim()) {
      updates.growth_classification = body.growth_classification.trim().slice(0, 120)
    }
    for (const field of [
      'hgri_score',
      'visibility_score',
      'conversion_score',
      'retention_score',
      'authority_score',
      'scalability_score',
    ]) {
      const score = toScore(body[field])
      if (score !== null) updates[field] = score
    }
    const strengths = toStringList(body.strengths)
    if (strengths) updates.strengths = strengths
    const opportunities = toStringList(body.opportunities)
    if (opportunities) updates.opportunities = opportunities

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await db
      .from('growth_reviews')
      .update(updates)
      .eq('id', id)
      .select('id, updated_at')
      .maybeSingle()

    if (error) return queryFailure('growth review save', error)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true, review: data })
  } catch (error) {
    console.error('[admin-api] growth review save error:', error)
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
  }
}
