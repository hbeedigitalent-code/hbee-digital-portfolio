// src/lib/proposal-file-validation.ts
//
// Server-side validation for proposal attachments. Every rule here is enforced
// in the upload route on the real File object — the browser's own checks are a
// convenience only and are never trusted.
//
// Supported: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, CSV. Download-only; nothing
// in the app renders or executes these files.

/** 25 MB, matching the existing client-portal upload convention. */
export const MAX_PROPOSAL_FILE_BYTES = 25 * 1024 * 1024
export const MAX_PROPOSAL_FILE_LABEL = '25MB'

/** Longest sanitized base name kept before the extension. */
const MAX_BASE_NAME_LENGTH = 120

/**
 * Extension is the authoritative gate. The MIME values listed per extension are
 * those browsers actually send.
 *
 * Note on `.csv`: Windows machines with Excel installed frequently report
 * `application/vnd.ms-excel` for a CSV. That is genuinely what arrives, so it is
 * accepted here. Extension remains the primary key, so a real `.xls` is still
 * classified as `.xls`.
 */
const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  csv: ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel'],
}

/** Canonical MIME stored when the browser sends a generic or empty type. */
const CANONICAL_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
}

/**
 * Browsers on machines without Office installed routinely report an empty or
 * generic type for .docx/.pptx/.xlsx. Those values are accepted ONLY when the
 * extension is already in the allow-list, and the canonical MIME for that
 * extension is stored instead of the generic string.
 *
 * This is a deliberate, documented trade-off. A declared MIME is client-supplied
 * metadata and is trivially spoofable, so strict matching buys little: the real
 * controls are the private bucket, admin-only upload behind session + 2FA +
 * active-admin, and the fact that these files are only ever downloaded, never
 * rendered or executed. Rejecting a legitimate .docx because Windows sent
 * `application/octet-stream` would cost usability for no security gain.
 */
const GENERIC_MIME_TYPES = ['', 'application/octet-stream', 'binary/octet-stream']

/** Accepted extensions, for the file input's `accept` attribute and messages. */
export const ALLOWED_PROPOSAL_EXTENSIONS = Object.keys(ALLOWED_EXTENSIONS)
export const PROPOSAL_FILE_ACCEPT_ATTRIBUTE = ALLOWED_PROPOSAL_EXTENSIONS.map(
  (ext) => `.${ext}`,
).join(',')

export interface ValidatedProposalFile {
  /** Display name, sanitized. Safe to render and to store as file_name. */
  fileName: string
  /** Canonical MIME for the resolved extension. */
  fileType: string
  /** Measured byte length from the File object itself. */
  fileSize: number
  extension: string
}

export type ProposalFileValidationResult =
  | { ok: true; file: ValidatedProposalFile }
  | { ok: false; error: string }

/**
 * Sanitizes a filename to the pattern already used by the onboarding upload
 * route: everything outside [A-Za-z0-9.-] becomes `_`. Any directory component
 * is stripped first, and the base name is length-capped while the extension is
 * preserved.
 */
export function sanitizeProposalFileName(rawName: string): string {
  // Strip any path the browser may have included (some report full paths).
  const baseOnly = rawName.split(/[\\/]/).pop() || ''
  const cleaned = baseOnly.replace(/[^a-zA-Z0-9.-]/g, '_')

  const lastDot = cleaned.lastIndexOf('.')
  if (lastDot <= 0) return cleaned.slice(0, MAX_BASE_NAME_LENGTH)

  const base = cleaned.slice(0, lastDot)
  const ext = cleaned.slice(lastDot) // includes the dot
  return `${base.slice(0, MAX_BASE_NAME_LENGTH)}${ext}`
}

function extensionOf(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === fileName.length - 1) return ''
  return fileName.slice(lastDot + 1).toLowerCase()
}

/**
 * Validates one uploaded file. Operates on the real File object: `size` is
 * measured, never taken from a form field, and the name is sanitized before any
 * of it reaches a storage key or the database.
 */
export function validateProposalFile(file: File): ProposalFileValidationResult {
  if (!file || typeof file.name !== 'string') {
    return { ok: false, error: 'No file was provided.' }
  }

  const fileName = sanitizeProposalFileName(file.name)
  if (!fileName || fileName === '.' || fileName.replace(/[._-]/g, '') === '') {
    return { ok: false, error: 'That file name is not valid.' }
  }

  const extension = extensionOf(fileName)
  if (!extension || !ALLOWED_EXTENSIONS[extension]) {
    return {
      ok: false,
      error: `That file type is not supported. Allowed: ${ALLOWED_PROPOSAL_EXTENSIONS.map((e) => e.toUpperCase()).join(', ')}.`,
    }
  }

  const declaredType = (file.type || '').toLowerCase().trim()
  const permitted = ALLOWED_EXTENSIONS[extension]
  const isGeneric = GENERIC_MIME_TYPES.includes(declaredType)

  if (!isGeneric && !permitted.includes(declaredType)) {
    return {
      ok: false,
      error: `The file contents do not match its .${extension} extension.`,
    }
  }

  const fileSize = typeof file.size === 'number' ? file.size : NaN
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return { ok: false, error: 'That file appears to be empty.' }
  }
  if (fileSize > MAX_PROPOSAL_FILE_BYTES) {
    return {
      ok: false,
      error: `File is too large. Maximum size is ${MAX_PROPOSAL_FILE_LABEL}.`,
    }
  }

  return {
    ok: true,
    file: {
      fileName,
      // Store the canonical type so file_type is always meaningful, even when
      // the browser sent a generic value.
      fileType: isGeneric ? CANONICAL_MIME[extension] : declaredType,
      fileSize,
      extension,
    },
  }
}

/** Human-readable size for UI display. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
