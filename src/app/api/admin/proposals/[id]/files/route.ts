// src/app/api/admin/proposals/[id]/files/route.ts
//
// POST — upload one proposal attachment. GET — list a proposal's attachments.
//
// Phase P2. Files live in the PRIVATE `proposal-files` bucket and are reachable
// only through short-lived signed URLs; no public URL is ever produced and
// object_path never leaves the server.
//
// Not covered by middleware.ts (its matcher is /admin/:path*,
// /admin-2fa-challenge and /client-portal/:path*, not /api/admin/:path*), so
// session, 2FA and active-admin are re-verified here independently.
//
// Nothing about identity or placement is taken from the request body:
// proposal_id comes from the URL, client_id is copied from the server-fetched
// proposal, uploaded_by is the session user, object_path is generated here, and
// file_type / file_size are derived from the real File object. Any
// uploaded_by / client_id / object_path / proposal_id form field is ignored.
//
// No notification and no email are emitted by this route.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'
import {
  PROPOSAL_FILES_BUCKET,
  buildProposalObjectPath,
} from '@/lib/proposal-storage-path'
import { validateProposalFile } from '@/lib/proposal-file-validation'

// Lazy, non-throwing service-role client — the same defensive pattern used by
// the other /api/admin routes. Deliberately NOT the shared
// src/lib/supabaseAdmin.ts singleton, which throws at import time when
// SUPABASE_SERVICE_ROLE_KEY is missing.
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Metadata only. object_path is excluded from the select() itself, not merely
// from the response mapping, so it is never pulled from the database here.
const FILE_METADATA_COLUMNS = 'id, proposal_id, file_name, file_type, file_size, uploaded_at'

type AuthResult =
  | { ok: true; adminClient: any; userId: string }
  | { ok: false; response: NextResponse }

async function requireActiveAdmin(): Promise<AuthResult> {
  // 1-2. Derive the caller from THEIR OWN session — never a client-supplied
  //      id/email/role/isAdmin flag of any kind.
  const sessionClient = createServerSupabaseClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  // 3-4. Verify the signed 2FA attestation cookie — the same function
  //      middleware uses, checked BEFORE any admin_users / service-role query.
  const cookieValue = cookies().get(ADMIN_2FA_COOKIE_NAME)?.value
  const twoFAVerified = await verifyAdmin2FACookie(cookieValue, user.id)
  if (!twoFAVerified) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  // 7. Service-role client obtained only after session + 2FA succeed.
  const adminClient = getServiceRoleClient()
  if (!adminClient) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }),
    }
  }

  // 5-6. Active-admin status, verified server-side.
  const { data: adminRow } = await adminClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!adminRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authorized as admin' }, { status: 403 }),
    }
  }

  return { ok: true, adminClient, userId: user.id }
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { adminClient } = auth

    const proposalId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(proposalId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: proposalRow } = await adminClient
      .from('proposals')
      .select('id')
      .eq('id', proposalId)
      .maybeSingle()

    if (!proposalRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: fileRows, error: filesError } = await adminClient
      .from('proposal_files')
      .select(FILE_METADATA_COLUMNS)
      .eq('proposal_id', proposalId)
      .order('uploaded_at', { ascending: false })

    if (filesError) {
      console.error('❌ Failed to list proposal files:', filesError)
      return NextResponse.json({ error: 'Failed to load files' }, { status: 500 })
    }

    return NextResponse.json({ files: fileRows || [] })
  } catch (error) {
    console.error('❌ Proposal file list error:', error)
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { adminClient, userId } = auth

    const proposalId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(proposalId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // The proposal must exist. client_id is read from the STORED row and is the
    // only source for the denormalised column below — never a form field.
    const { data: proposalRow } = await adminClient
      .from('proposals')
      .select('id, client_id')
      .eq('id', proposalId)
      .maybeSingle()

    if (!proposalRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Expected a file upload.' }, { status: 400 })
    }

    // One file per request. The admin UI uploads sequentially, which keeps the
    // failure mode per-file and the cleanup below unambiguous.
    const candidate = formData.get('file')
    if (!candidate || typeof candidate === 'string') {
      return NextResponse.json({ error: 'No file was provided.' }, { status: 400 })
    }

    const validation = validateProposalFile(candidate as File)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { fileName, fileType, fileSize } = validation.file
    const objectPath = buildProposalObjectPath(proposalId, randomUUID(), fileName)

    const { error: uploadError } = await adminClient.storage
      .from(PROPOSAL_FILES_BUCKET)
      .upload(objectPath, candidate as File, {
        contentType: fileType,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('❌ Proposal file upload failed:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    const { data: fileRow, error: insertError } = await adminClient
      .from('proposal_files')
      .insert({
        proposal_id: proposalId,
        client_id: proposalRow.client_id ?? null,
        file_name: fileName,
        object_path: objectPath,
        file_type: fileType,
        file_size: fileSize,
        uploaded_by: userId,
      })
      .select(FILE_METADATA_COLUMNS)
      .single()

    if (insertError || !fileRow) {
      // Metadata is the source of truth. An object with no row is unreachable
      // and unmanageable, so roll the storage write back rather than orphan it.
      console.error('❌ Proposal file metadata insert failed, removing object:', insertError)
      const { error: cleanupError } = await adminClient.storage
        .from(PROPOSAL_FILES_BUCKET)
        .remove([objectPath])

      if (cleanupError) {
        console.error('⚠️ Failed to clean up orphaned proposal object:', cleanupError)
      }

      return NextResponse.json({ error: 'Failed to save file' }, { status: 500 })
    }

    // Metadata only — object_path is never returned.
    return NextResponse.json({ success: true, file: fileRow })
  } catch (error) {
    console.error('❌ Proposal file upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
