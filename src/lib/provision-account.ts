// src/lib/provision-account.ts
//
// SERVER-ONLY. Idempotent account provisioning for a VERIFIED user.
//
// Replaces the browser-side table writes in
// src/lib/services/merchant-auth-service.ts, which ran at signup time. That was
// wrong twice over:
//
//   1. supabase.auth.signUp() with email confirmation enabled returns a user
//      but NO session, so those inserts executed as the ANON role. They only
//      worked because merchant_accounts and clients carried broad anon grants —
//      exactly the grants the access lockdown removes.
//   2. Both inserts had their errors logged and swallowed, so signup reported
//      complete success while silently creating no merchant record.
//
// Provisioning therefore moves to the point where a verified identity actually
// exists: email confirmation. Both confirmation paths call this one function.
//
// IDENTITY IS NEVER SUPPLIED BY A CALLER OF THE APPLICATION. `user` here is the
// object returned by Supabase auth (verifyOtp server-side, or getUser() against
// the session cookie), never a request body.
//
// RETRY SAFETY. Provisioning may run more than once for the same user — both
// confirmation paths may run, and the authenticated endpoint can be called
// again afterwards. Each record is created only when absent, and an existing
// row is NEVER overwritten. The single exception is email_verified, which is
// lifted false -> true from trusted auth state and never lowered.
//
// CONCURRENCY IS NOT PROVIDED BY THIS FILE ALONE. clients.user_id currently
// has a NON-UNIQUE index, so two simultaneous runs could each pass the
// existence check and insert, with no unique violation raised to catch it.
// The additive partial unique index on non-null clients.user_id is the half
// of this fix that makes convergence real, and it must be applied BEFORE this
// code is depended upon. This file's job is to resolve the conflict CORRECTLY
// once the database raises one: every unique violation is followed by a
// re-read keyed on the authenticated user id, and "already provisioned" is
// reported only when the row this user actually owns is found.
//
// NOT AN APPROVAL. Creating these records is account provisioning only. It
// grants no program acceptance: merchant_accounts.status is the account's own
// lifecycle field, growth_assessments.review_status is untouched, and no
// growth profile, merchant link or score is written here.

import { getPrivilegedClient } from '@/lib/admin-api-auth'

if (typeof window !== 'undefined') {
  throw new Error('provision-account.ts is server-only and must not be imported by client code')
}

/** Postgres unique_violation. A concurrent provisioning run got there first. */
const UNIQUE_VIOLATION = '23505'

const MAX_FIELD = 200

/** Control characters, stripped out of every stored string. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = new RegExp('[\u0000-\u001F\u007F]', 'g')

/** Trusted shape of the verified auth user. Only these fields are consulted. */
export interface VerifiedUser {
  id: string
  email?: string | null
  email_confirmed_at?: string | null
  user_metadata?: Record<string, unknown> | null
}

export type RecordOutcome = 'created' | 'existing' | 'updated' | 'failed'

export interface ProvisionResult {
  ok: boolean
  client: RecordOutcome
  merchant: RecordOutcome
  /** Non-sensitive reason for a partial or total failure, safe to log. */
  reason?: string
}

/**
 * Ordinary profile fields only, read from the verified auth record's metadata.
 *
 * user_metadata is writable by the account holder, which is precisely why the
 * allow-list is limited to fields that describe their own business. No status,
 * verification, merchant link, score, classification or approval field is ever
 * read from it.
 */
const PROFILE_FIELDS = [
  'full_name',
  'contact_name',
  'business_name',
  'whatsapp',
  'website_url',
  'country',
  'industry',
] as const

type ProfileField = (typeof PROFILE_FIELDS)[number]

/** Trimmed, control-character-stripped, length-bounded, or null. */
function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(CONTROL_CHARS, '').trim()
  return cleaned ? cleaned.slice(0, MAX_FIELD) : null
}

function readProfile(user: VerifiedUser): Record<ProfileField, string | null> {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const out = {} as Record<ProfileField, string | null>
  for (const field of PROFILE_FIELDS) out[field] = text(meta[field])
  return out
}

/**
 * Create the client and merchant records for a verified user, if they are not
 * already there. Safe to call repeatedly.
 *
 * Returns a per-record outcome so a caller can report a PARTIAL failure rather
 * than a blanket success. The two writes are separate statements against
 * separate tables and are explicitly NOT atomic with each other.
 */
export async function provisionAccount(user: VerifiedUser): Promise<ProvisionResult> {
  if (!user?.id) {
    return { ok: false, client: 'failed', merchant: 'failed', reason: 'no_user' }
  }

  const db = getPrivilegedClient()
  if (!db) {
    console.error('[provision-account] privileged client unavailable')
    return { ok: false, client: 'failed', merchant: 'failed', reason: 'server_configuration' }
  }

  const profile = readProfile(user)
  const email = text(user.email)
  const emailVerified = Boolean(user.email_confirmed_at)

  const fallbackName =
    profile.full_name || profile.contact_name || (email ? email.split('@')[0] : null) || 'Client'

  // -------------------------------------------------------------------
  // 1. clients — the record the portal actually reads.
  //
  // `status` is deliberately absent: the column defaults to 'Active' and is a
  // trusted field, so the INSERT column grant excludes it. merchant_id,
  // growth_profile_id, hgri_score and growth_classification are likewise never
  // written here — provisioning does not link or classify anyone.
  //
  // CONCURRENCY. clients.user_id carries a NON-UNIQUE index today, so
  // check-then-insert alone can produce two rows for one user under a race,
  // and no unique violation would be raised to catch it. The database half of
  // this fix is the additive partial unique index on non-null clients.user_id,
  // which must be applied BEFORE this code is relied upon (see the rollout in
  // the batch report). Once it exists, a losing concurrent insert raises 23505
  // and is resolved below by re-reading the caller's OWN row.
  // -------------------------------------------------------------------
  let clientOutcome: RecordOutcome = 'failed'
  let clientReason: string | undefined

  // limit(2) rather than maybeSingle(): until the unique index is in place,
  // more than one row can exist, and the application treats that as ambiguous
  // ownership everywhere else. Refuse it here too rather than picking one or
  // surfacing it as an opaque query error.
  const { data: clientRows, error: clientLookupError } = await db
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .limit(2)

  if (clientLookupError) {
    console.error(
      `[provision-account] clients lookup failed (code=${
        (clientLookupError as { code?: string }).code ?? 'n/a'
      })`,
    )
    clientReason = 'client_lookup_failed'
  } else if (clientRows && clientRows.length > 1) {
    console.error(
      `[provision-account] ambiguous client ownership for user ${user.id} — provisioning refused`,
    )
    clientReason = 'client_ambiguous'
  } else if (clientRows && clientRows.length === 1) {
    // Present already. Nothing is updated — an existing client's name, links
    // and status stay exactly as they are.
    clientOutcome = 'existing'
  } else {
    const { error: clientInsertError } = await db.from('clients').insert({
      user_id: user.id,
      full_name: fallbackName,
      email,
      business_name: profile.business_name || 'My Business',
      website_url: profile.website_url,
      whatsapp: profile.whatsapp,
      country: profile.country,
    })

    if (!clientInsertError) {
      clientOutcome = 'created'
    } else if ((clientInsertError as { code?: string }).code === UNIQUE_VIOLATION) {
      // A conflict is NOT assumed to mean 'a concurrent run created my row'.
      // clients has other unique objects (id), so the only safe reading is to
      // go back and look for the row this user actually owns.
      const { data: recheck, error: recheckError } = await db
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .limit(2)

      if (recheckError) {
        console.error(
          `[provision-account] clients conflict recheck failed (code=${
            (recheckError as { code?: string }).code ?? 'n/a'
          })`,
        )
        clientReason = 'client_conflict_recheck_failed'
      } else if (recheck && recheck.length === 1) {
        // The conflict was the concurrent run. Converged on its row.
        clientOutcome = 'existing'
      } else if (recheck && recheck.length > 1) {
        console.error(
          `[provision-account] ambiguous client ownership for user ${user.id} after conflict`,
        )
        clientReason = 'client_ambiguous'
      } else {
        // A unique violation with no owned row behind it. Something else
        // conflicted; this is a failure, not a quiet success.
        console.error(
          `[provision-account] clients unique violation with no owned row for user ${user.id}`,
        )
        clientReason = 'client_conflict_unresolved'
      }
    } else {
      console.error(
        `[provision-account] clients insert failed (code=${
          (clientInsertError as { code?: string }).code ?? 'n/a'
        })`,
      )
      clientReason = 'client_insert_failed'
    }
  }

  // -------------------------------------------------------------------
  // 2. merchant_accounts — keyed by the auth user id, which is what the
  //    original browser insert used. Identity comes from the verified user.
  //
  // `status` is set once, at creation, by the server. It is the account's own
  // lifecycle value and carries no program approval. It is never rewritten on a
  // retry, so a later administrative change cannot be undone by reopening a
  // confirmation link.
  //
  // `email_verified` is derived from the auth record's email_confirmed_at and
  // is never accepted from a caller.
  // -------------------------------------------------------------------
  let merchantOutcome: RecordOutcome = 'failed'
  let merchantReason: string | undefined

  const { data: existingMerchant, error: merchantLookupError } = await db
    .from('merchant_accounts')
    .select('id, email_verified')
    .eq('id', user.id)
    .maybeSingle()

  if (merchantLookupError) {
    console.error(
      `[provision-account] merchant_accounts lookup failed (code=${
        (merchantLookupError as { code?: string }).code ?? 'n/a'
      })`,
    )
    merchantReason = 'merchant_lookup_failed'
  } else if (existingMerchant) {
    merchantOutcome = 'existing'

    // The one permitted write to an existing row: lift verification to match
    // trusted auth state. Never lowered, and nothing else is touched.
    if (emailVerified && existingMerchant.email_verified !== true) {
      const { error: verifyError } = await db
        .from('merchant_accounts')
        .update({ email_verified: true })
        .eq('id', user.id)

      if (verifyError) {
        console.error(
          `[provision-account] merchant_accounts verification update failed (code=${
            (verifyError as { code?: string }).code ?? 'n/a'
          })`,
        )
        merchantOutcome = 'failed'
        merchantReason = 'merchant_verification_failed'
      } else {
        merchantOutcome = 'updated'
      }
    }
  } else {
    const { error: merchantInsertError } = await db.from('merchant_accounts').insert({
      id: user.id,
      business_name: profile.business_name,
      contact_name: profile.contact_name || profile.full_name,
      email,
      whatsapp: profile.whatsapp,
      website_url: profile.website_url,
      country: profile.country,
      industry: profile.industry,
      status: 'active',
      email_verified: emailVerified,
    })

    if (!merchantInsertError) {
      merchantOutcome = 'created'
    } else if ((merchantInsertError as { code?: string }).code === UNIQUE_VIOLATION) {
      // merchant_accounts has TWO unique objects: id and email. A conflict
      // therefore does not mean 'my row already exists' — it may mean this
      // email already belongs to a DIFFERENT account. Re-read by the
      // authenticated user id and decide from what is actually owned.
      const { data: recheck, error: recheckError } = await db
        .from('merchant_accounts')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (recheckError) {
        console.error(
          `[provision-account] merchant_accounts conflict recheck failed (code=${
            (recheckError as { code?: string }).code ?? 'n/a'
          })`,
        )
        merchantReason = 'merchant_conflict_recheck_failed'
      } else if (recheck) {
        // The conflict was on id: a concurrent run created this user's own
        // row. Converged on it.
        merchantOutcome = 'existing'
      } else {
        // The conflict was on email, and the owning row is NOT this user's.
        // Nothing is linked, nothing is overwritten, and the other account is
        // never named or hinted at — the caller gets the same generic setup
        // failure as any other provisioning problem.
        console.error(
          `[provision-account] merchant_accounts email conflict for user ${user.id}; ` +
            'the address belongs to another account. No link or overwrite performed.',
        )
        merchantReason = 'merchant_email_conflict'
      }
    } else {
      console.error(
        `[provision-account] merchant_accounts insert failed (code=${
          (merchantInsertError as { code?: string }).code ?? 'n/a'
        })`,
      )
      merchantReason = 'merchant_insert_failed'
    }
  }

  const ok = clientOutcome !== 'failed' && merchantOutcome !== 'failed'

  return {
    ok,
    client: clientOutcome,
    merchant: merchantOutcome,
    reason: ok ? undefined : clientReason || merchantReason || 'provisioning_failed',
  }
}
