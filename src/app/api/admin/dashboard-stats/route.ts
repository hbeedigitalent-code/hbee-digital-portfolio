// src/app/api/admin/dashboard-stats/route.ts
//
// GET — the counts the admin dashboard and workspace pages need from tables
// that are moving behind server-side authorization.
//
// SCOPE, deliberately narrow: this endpoint covers ONLY `clients`,
// `growth_assessments` and `growth_scores` — the three tables in those two
// pages that ordinary roles are losing access to. Every other tile on those
// pages (projects, leads, tasks, invoices, onboarding, inquiries, requests)
// keeps its existing browser query untouched, because those tables are not part
// of this lockdown and rewriting them would widen the batch for no security
// gain.
//
// It returns fixed aggregate numbers plus a short recent-assessment list. It
// takes no parameters at all — no table name, no filter, no column list — so it
// cannot be used as a general-purpose query surface.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure } from '@/lib/admin-api-auth'

/** Statuses the dashboard counts as "awaiting attention". */
const NEW_ASSESSMENT_STATUS = 'New Submission'

export async function GET() {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { db } = auth

    const [clientsRes, pendingAssessmentsRes, growthScoresRes, recentAssessmentsRes] =
      await Promise.all([
        db.from('clients').select('id', { count: 'exact', head: true }),
        db
          .from('growth_assessments')
          .select('id', { count: 'exact', head: true })
          .eq('status', NEW_ASSESSMENT_STATUS),
        db.from('growth_scores').select('classification').limit(1000),
        db
          .from('growth_assessments')
          .select('id, status, created_at, merchants(business_name)')
          .order('created_at', { ascending: false })
          .limit(3),
      ])

    if (clientsRes.error) return queryFailure('dashboard clients count', clientsRes.error)
    if (pendingAssessmentsRes.error)
      return queryFailure('dashboard assessment count', pendingAssessmentsRes.error)
    if (growthScoresRes.error)
      return queryFailure('dashboard growth scores', growthScoresRes.error)
    if (recentAssessmentsRes.error)
      return queryFailure('dashboard recent assessments', recentAssessmentsRes.error)

    const scores = growthScoresRes.data || []

    return NextResponse.json({
      totalClients: clientsRes.count ?? 0,
      pendingAssessments: pendingAssessmentsRes.count ?? 0,
      totalGrowthScores: scores.length,
      growthReady: scores.filter(
        (s: any) => s.classification === 'Growth Ready' || s.classification === 'Scale Ready',
      ).length,
      recentAssessments: recentAssessmentsRes.data || [],
    })
  } catch (error) {
    console.error('[admin-api] dashboard stats error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
