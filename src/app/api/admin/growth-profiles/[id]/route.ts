// src/app/api/admin/growth-profiles/[id]/route.ts
//
// GET   — one growth profile with its merchant, assessment and latest PDF.
// PATCH — archive / reactivate a profile (is_active only).
//
// Replaces the direct browser reads in
// src/app/admin/growth-profiles/[id]/page.tsx (growth_profiles +
// growth_profile_pdfs) and the is_active toggle in
// src/app/admin/growth-profiles/page.tsx.
//
// PATCH accepts a single boolean and nothing else — profile content, scores,
// merchant_id and assessment_id are produced by the review completion route and
// are not editable here.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'

const DETAIL_COLUMNS = `
  id, title, summary, hgri_score, growth_classification, profile_data,
  strengths, opportunities, is_active, created_at, merchant_id, assessment_id,
  merchant:merchants(id, business_name, contact_name, email, website, industry, country),
  assessment:growth_assessments(*)
`

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { db } = auth

    const id = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!ADMIN_UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: profile, error } = await db
      .from('growth_profiles')
      .select(DETAIL_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (error) return queryFailure('growth profile detail', error)
    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: pdfRows, error: pdfError } = await db
      .from('growth_profile_pdfs')
      .select('file_url, uploaded_at')
      .eq('growth_profile_id', profile.id)
      .eq('is_latest', true)
      .order('uploaded_at', { ascending: false })
      .limit(1)

    if (pdfError) return queryFailure('growth profile pdf', pdfError)

    return NextResponse.json({
      profile,
      pdf_url: typeof pdfRows?.[0]?.file_url === 'string' ? pdfRows[0].file_url : null,
    })
  } catch (error) {
    console.error('[admin-api] growth profile detail error:', error)
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
    if (!body || typeof body !== 'object' || typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 })
    }

    const { data, error } = await db
      .from('growth_profiles')
      .update({ is_active: body.is_active })
      .eq('id', id)
      .select('id, is_active')
      .maybeSingle()

    if (error) return queryFailure('growth profile update', error)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true, profile: data })
  } catch (error) {
    console.error('[admin-api] growth profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
