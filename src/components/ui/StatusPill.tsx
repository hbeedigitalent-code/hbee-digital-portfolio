import type { HTMLAttributes } from 'react'
import Badge from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

type Tone = 'success' | 'warning' | 'error' | 'accent' | 'neutral'

/**
 * Status → semantic bucket. Matching is case-insensitive and by contained
 * keyword stem, so multi-word database values resolve correctly:
 *   "Pending Review"           → warning  (contains "pending" / "review")
 *   "In Progress"              → warning  (contains "progress")
 *   "Completed"                → success  (contains "complet")
 *   "Awaiting Client Feedback" → accent   (contains "awaiting")
 * Buckets are checked in order; the first keyword hit wins. Anything that
 * matches nothing falls through to the neutral bucket.
 *
 * Token pairs (defined for both themes in globals.css):
 *   success → --success / --success-subtle   (success / approved / completed)
 *   warning → --warning / --warning-subtle   (progress / active / pending)
 *   error   → --error   / --error-subtle     (error / rejected / overdue)
 *   accent  → --accent  / --accent-subtle    (info / submitted / open / awaiting)
 *   neutral → --text-secondary / --bg-subtle / --border  (draft / paused / …)
 */
const BUCKETS: ReadonlyArray<readonly [Tone, readonly string[]]> = [
  ['error', ['error', 'reject', 'overdue', 'fail', 'declin']],
  ['success', ['success', 'approv', 'complet', 'paid', 'ready', 'resolved']],
  ['accent', ['info', 'submit', 'open', 'awaiting', 'sent']],
  ['warning', ['progress', 'pending', 'review', 'revision', 'onboarding', 'active', 'assets']],
  ['neutral', ['draft', 'paus', 'cancel', 'archiv', 'closed', 'new', 'none', 'n/a', 'unknown']],
]

function statusToTone(status: string | null | undefined): Tone {
  const s = (status ?? '').toLowerCase().trim()
  if (!s) return 'neutral'
  // "inactive" contains "active"; keep it neutral rather than warning.
  if (s.includes('inactive')) return 'neutral'
  for (const [tone, keywords] of BUCKETS) {
    if (keywords.some((k) => s.includes(k))) return tone
  }
  return 'neutral'
}

interface StatusPillProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  status: string | null | undefined
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Presentational status pill for authenticated (admin / client-portal)
 * surfaces. Maps a raw status string to one of five semantic token buckets
 * and renders it through the canonical <Badge>. It does NO data fetching
 * and does not transform the status for anything except choosing a colour —
 * the original text is displayed verbatim and carried on `title` for
 * assistive tech.
 */
export default function StatusPill({
  status,
  size = 'md',
  className,
  ...rest
}: StatusPillProps) {
  const label = status != null && String(status).trim() !== '' ? String(status) : 'Unknown'

  return (
    <Badge
      tone={statusToTone(status)}
      size={size}
      className={cn('capitalize', className)}
      title={label}
      {...rest}
    >
      {label}
    </Badge>
  )
}
