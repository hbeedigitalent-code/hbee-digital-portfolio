// src/app/api/admin/proposals/options/route.ts
//
// Returns the authorized option set for the "New Proposal" form: every merchant
// that has at least one ACTIVE growth profile, with those profiles nested.
//
// P1 of the proposal-flow rebuild. The page previously drove this list from
// merchant_status with a narrow status filter, and silently discarded rows
// whose embedded merchant came back null — which is why the dropdown rendered
// empty with nothing in the console to explain it. This route instead drives
// from the same growth_profiles -> merchants relationship the working
// /admin/growth-profiles page uses, and reads it with the service-role client
// only after the caller has been fully authorized.
//
// Not covered by middleware.ts (its matcher is /admin/:path* and
// /client-portal/:path*, not /api/admin/:path*), so session, 2FA, and
// active-admin are all re-verified here independently, in the same order
// middleware uses for /admin/* pages.
//
// This route takes no input. It returns only the option set the authenticated
// admin is allowed to see — no merchant id from the query string is trusted or
// even read here.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'

// Lazy, non-throwing service-role client — the same defensive pattern used by
// the other /api/admin routes. Deliberately NOT the shared
// src/lib/supabaseAdmin.ts singleton, which throws at import time when
// SUPABASE_SERVICE_ROLE_KEY is missing and would crash the whole route instead
// of returning a clean JSON error.
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

interface ProposalOptionProfile {
  id: string
  hgri_score: number | null
  growth_classification: string | null
  summary: string | null
}

interface ProposalOptionMerchant {
  id: string
  business_name: string | null
  email: string | null
  website: string | null
  contact_name: string | null
  industry: string | null
  profiles: ProposalOptionProfile[]
}

export async function GET() {
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
    //    A missing, invalid or mismatched cookie gets the same generic 401 as
    //    "no session".
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

    // 4. Same data family as the working /admin/growth-profiles page: active
    //    growth profiles joined to their merchant. Only the columns the
    //    proposal form actually renders are selected — no auth data, no
    //    credentials, nothing extra.
    const { data: rows, error } = await adminClient
      .from('growth_profiles')
      .select(`
        id,
        hgri_score,
        growth_classification,
        summary,
        created_at,
        merchant:merchants(
          id,
          business_name,
          email,
          website,
          contact_name,
          industry
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Failed to load proposal options:', error)
      return NextResponse.json({ error: 'Failed to load proposal options' }, { status: 500 })
    }

    // 5. Group the profiles under their merchant. Rows arrive created_at DESC,
    //    so each merchant's profiles keep that order by construction, and the
    //    Map both deduplicates merchants and preserves first-seen order.
    //    A row whose merchant embed is null is skipped rather than surfaced as
    //    a blank option.
    const byMerchant = new Map<string, ProposalOptionMerchant>()

    for (const row of (rows || []) as any[]) {
      const merchant = Array.isArray(row.merchant) ? row.merchant[0] : row.merchant
      if (!merchant?.id) continue

      let entry = byMerchant.get(merchant.id)
      if (!entry) {
        entry = {
          id: merchant.id,
          business_name: merchant.business_name ?? null,
          email: merchant.email ?? null,
          website: merchant.website ?? null,
          contact_name: merchant.contact_name ?? null,
          industry: merchant.industry ?? null,
          profiles: [],
        }
        byMerchant.set(merchant.id, entry)
      }

      entry.profiles.push({
        id: row.id,
        hgri_score: row.hgri_score ?? null,
        growth_classification: row.growth_classification ?? null,
        summary: row.summary ?? null,
      })
    }

    // 6. Only merchants with at least one active profile can reach this point.
    //    Sort by business name so the dropdown is stable and human-ordered.
    const merchants = Array.from(byMerchant.values()).sort((a, b) =>
      (a.business_name || '').localeCompare(b.business_name || ''),
    )

    return NextResponse.json({ merchants })
  } catch (error) {
    console.error('❌ Proposal options error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
