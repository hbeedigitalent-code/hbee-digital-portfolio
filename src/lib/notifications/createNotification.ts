// src/lib/notifications/createNotification.ts
//
// SERVER-ONLY — trusted notification writer (Phase N, Batch N1).
//
// This module builds a Supabase *service-role* client and reads
// SUPABASE_SERVICE_ROLE_KEY. It must NEVER be imported — statically or
// dynamically — from a Client Component or any module reachable from one.
// Import it only from Route Handlers, Server Actions, or other server-only
// modules. A browser-side evaluation of this file throws immediately (guard
// below) so the mistake fails loudly in development.
//
// The helper performs no authentication / session resolution. For a
// client-scoped notification the caller passes the already-resolved
// `clients.id` UUID as `recipientId`.

import { createHash } from 'crypto'

if (typeof window !== 'undefined') {
  throw new Error(
    'createNotification.ts is server-only and must not be imported by client code',
  )
}

export type NotificationScope = 'admin' | 'client'

export interface CreateNotificationParams {
  scope: NotificationScope
  recipientId?: string | null
  type: string
  title: string
  message: string
  entityType?: string | null
  entityId?: string | null
  link?: string | null
  legacyMerchantId?: string | null
}

export interface CreateNotificationResult {
  ok: boolean
  id?: string
  idempotencyKey?: string
  deduped?: boolean
  skipped?: 'invalid-input' | 'invalid-recipient' | 'no-service-role' | 'insert-error'
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim())
}

// Lazy, non-throwing service-role client — the defensive pattern from
// src/app/api/admin/clients/[client_id]/files/route.ts. Deliberately NOT the
// src/lib/supabaseAdmin.ts singleton, which throws at import time when the key
// is missing.
let serviceRoleClient: any = null

function getServiceRoleClient(): any {
  if (serviceRoleClient) return serviceRoleClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const { createClient } = require('@supabase/supabase-js')
  serviceRoleClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return serviceRoleClient
}

// Deterministic key: identical logical events collapse to one notification row
// via the partial unique index on notifications.idempotency_key. Built only
// from non-sensitive identifiers (type + entity + scope + recipient) — never
// from title/message.
function buildIdempotencyKey(input: {
  type: string
  entityType: string | null
  entityId: string | null
  scope: NotificationScope
  recipientId: string | null
}): string {
  const canonical = [
    input.type,
    input.entityType ?? '',
    input.entityId ?? '',
    input.scope,
    input.recipientId ?? '',
  ].join('|')
  return createHash('sha256').update(canonical).digest('hex')
}

/**
 * Insert one notification row using the service-role client. Never throws:
 * every failure is caught, logged without sensitive content, and returned as
 * `{ ok: false, ... }`. A unique-key collision is reported as an idempotent
 * success (`{ ok: true, deduped: true }`).
 *
 * Writes the N0 columns (recipient_scope, recipient_id, entity_type,
 * entity_id, idempotency_key) plus the transitional legacy columns (user_id,
 * user_type, read). `read_at` is left NULL on creation.
 */
export async function createNotification(
  params: CreateNotificationParams,
): Promise<CreateNotificationResult> {
  try {
    const {
      scope,
      recipientId = null,
      type,
      title,
      message,
      entityType = null,
      entityId = null,
      link = null,
      legacyMerchantId = null,
    } = params

    if (scope !== 'admin' && scope !== 'client') {
      console.warn('[createNotification] invalid scope — notification skipped')
      return { ok: false, skipped: 'invalid-input' }
    }
    if (!type || !title || !message) {
      console.warn(
        '[createNotification] missing type/title/message — notification skipped',
      )
      return { ok: false, skipped: 'invalid-input' }
    }
    if (entityId != null && !isUuid(entityId)) {
      console.warn(
        '[createNotification] entityId is not a valid UUID — notification skipped',
      )
      return { ok: false, skipped: 'invalid-input' }
    }

    let recipient_id: string | null = null
    let legacy_user_id: string | null = null
    let user_type: 'admin' | 'client'

    if (scope === 'admin') {
      recipient_id = null // admin broadcast
      legacy_user_id = null // never the string 'admin'
      user_type = 'admin'
    } else {
      if (!isUuid(recipientId)) {
        console.warn(
          '[createNotification] client scope requires a valid recipientId (clients.id) — notification skipped',
        )
        return { ok: false, skipped: 'invalid-recipient' }
      }
      recipient_id = recipientId.trim()
      user_type = 'client'
      // Keep the legacy merchant UUID in user_id only when the caller supplies
      // it. Never place clients.id into user_id.
      legacy_user_id = isUuid(legacyMerchantId) ? legacyMerchantId.trim() : null
    }

    const normalizedEntityId = isUuid(entityId) ? entityId.trim() : null
    const idempotencyKey = buildIdempotencyKey({
      type,
      entityType,
      entityId: normalizedEntityId,
      scope,
      recipientId: recipient_id,
    })

    const supabase = getServiceRoleClient()
    if (!supabase) {
      console.warn(
        '[createNotification] service-role client unavailable — notification not created',
      )
      return { ok: false, skipped: 'no-service-role', idempotencyKey }
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_scope: scope,
        recipient_id,
        type,
        title,
        message,
        link,
        entity_type: entityType,
        entity_id: normalizedEntityId,
        idempotency_key: idempotencyKey,
        user_id: legacy_user_id,
        user_type,
        read: false,
        // read_at intentionally omitted so it stays NULL on creation.
      })
      .select('id')
      .single()

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        // Unique violation on the partial idempotency index -> already created.
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle()
        return { ok: true, deduped: true, id: existing?.id, idempotencyKey }
      }
      console.error(
        `[createNotification] insert failed (code=${
          (error as { code?: string }).code ?? 'n/a'
        })`,
      )
      return { ok: false, skipped: 'insert-error', idempotencyKey }
    }

    return { ok: true, id: data?.id as string | undefined, idempotencyKey }
  } catch (err) {
    console.error(
      `[createNotification] unexpected error: ${
        err instanceof Error ? err.name : 'unknown'
      }`,
    )
    return { ok: false }
  }
}

/**
 * Server-side data lookup: resolve the authoritative `clients.id` for a legacy
 * merchant UUID. This is a plain data query on the service-role client, not
 * authentication resolution. Returns `null` when the merchant id is invalid,
 * the service-role client is unavailable, or no matching client row exists.
 */
export async function resolveClientIdByMerchantId(
  merchantId: string | null | undefined,
): Promise<string | null> {
  try {
    if (!isUuid(merchantId)) return null
    const supabase = getServiceRoleClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .eq('merchant_id', merchantId.trim())
      .maybeSingle()

    if (error || !data) return null
    return (data.id as string | undefined) ?? null
  } catch {
    return null
  }
}
