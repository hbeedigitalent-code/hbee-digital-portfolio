// src/app/api/admin/proposals/options/route.ts
//
// Returns the authorized option set for the "New Proposal" form: EVERY
// merchant, each annotated with whether it has an active growth profile and
// whether it is linked to a client-portal account.
//
// Eligibility rules (corrected in P1.5-revised):
//   Draft creation : a valid merchant is required. A growth profile is NOT
//                    required. A client-portal link is NOT required.
//   Portal send    : a client link IS required — a draft cannot be delivered to
//                    a portal that does not exist. That send action is not
//                    implemented yet.
//   Notification / email : only after a valid send transition AND a client
//                    link. Nothing is emitted at draft time.
//
// Earlier revisions drove this list from merchant_status (too narrow) and then
// from growth_profiles (which silently hid every merchant that had not been
// through a growth review). Both were wrong: they filtered the dropdown by a
// rule that proposal creation does not actually enforce, so admins could not
// select merchants the API would happily have accepted. Merchants are now the
// driving table and the two flags are display metadata only.
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
  /** Active growth profiles — OPTIONAL display metadata, never eligibility. */
  profiles: ProposalOptionProfile[]
  has_active_growth_profile: boolean
  /** True when a clients row links to this merchant via clients.merchant_id. */
  has_client_portal_link: boolean
  /** Server-resolved clients.id, or null when unlinked. Display metadata only —
   *  POST /api/admin/proposals re-resolves this itself and never trusts it. */
  client_id: string | null
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

    // 4. Merchants are the driving table. Eligibility to appear here is simply
    //    "the merchant exists" — a growth profile is NOT required, and neither
    //    is a client-portal link. Only the columns the proposal form actually
    //    renders are selected: no auth data, no credentials, nothing extra.
    const { data: merchantRows, error: merchantsError } = await adminClient
      .from('merchants')
      .select('id, business_name, email, website, contact_name, industry')
      .order('business_name', { ascending: true })

    if (merchantsError) {
      console.error('❌ Failed to load merchants:', merchantsError)
      return NextResponse.json({ error: 'Failed to load proposal options' }, { status: 500 })
    }

    const merchantList = (merchantRows || []) as any[]
    const merchantIds = merchantList.map((m) => m.id).filter(Boolean)

    // 5. Client-portal linkage, resolved SERVER-SIDE through
    //    clients.merchant_id = merchants.id. This is display/eligibility
    //    metadata only — a merchant without a link is still returned and still
    //    selectable, because a draft proposal does not require one.
    const clientIdByMerchant = new Map<string, string>()
    if (merchantIds.length > 0) {
      const { data: clientRows, error: clientsError } = await adminClient
        .from('clients')
        .select('id, merchant_id')
        .in('merchant_id', merchantIds)

      if (clientsError) {
        // Non-fatal: the dropdown still works, every merchant simply reports
        // "no client linked" until this read succeeds.
        console.error('⚠️ Failed to resolve client links for merchants:', clientsError)
      } else {
        for (const row of (clientRows || []) as any[]) {
          if (row.merchant_id && row.id && !clientIdByMerchant.has(row.merchant_id)) {
            clientIdByMerchant.set(row.merchant_id, row.id)
          }
        }
      }
    }

    // 6. Active growth profiles, attached as OPTIONAL display metadata. Their
    //    absence never removes a merchant from the list.
    const profilesByMerchant = new Map<string, ProposalOptionProfile[]>()
    if (merchantIds.length > 0) {
      const { data: profileRows, error: profilesError } = await adminClient
        .from('growth_profiles')
        .select('id, hgri_score, growth_classification, summary, merchant_id, created_at')
        .eq('is_active', true)
        .in('merchant_id', merchantIds)
        .order('created_at', { ascending: false })

      if (profilesError) {
        // Non-fatal for the same reason: profiles are metadata, not eligibility.
        console.error('⚠️ Failed to load growth profiles for merchants:', profilesError)
      } else {
        for (const row of (profileRows || []) as any[]) {
          if (!row.merchant_id) continue
          const list = profilesByMerchant.get(row.merchant_id) || []
          list.push({
            id: row.id,
            hgri_score: row.hgri_score ?? null,
            growth_classification: row.growth_classification ?? null,
            summary: row.summary ?? null,
          })
          profilesByMerchant.set(row.merchant_id, list)
        }
      }
    }

    // 7. Assemble. Every merchant is returned; the flags tell the form what it
    //    can offer, never whether the merchant may be chosen.
    const merchants: ProposalOptionMerchant[] = merchantList
      .filter((m) => !!m?.id)
      .map((m) => {
        const profiles = profilesByMerchant.get(m.id) || []
        const clientId = clientIdByMerchant.get(m.id) ?? null

        return {
          id: m.id,
          business_name: m.business_name ?? null,
          email: m.email ?? null,
          website: m.website ?? null,
          contact_name: m.contact_name ?? null,
          industry: m.industry ?? null,
          profiles,
          has_active_growth_profile: profiles.length > 0,
          has_client_portal_link: clientId !== null,
          client_id: clientId,
        }
      })
      .sort((a, b) => (a.business_name || '').localeCompare(b.business_name || ''))

    return NextResponse.json({ merchants })
  } catch (error) {
    console.error('❌ Proposal options error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
