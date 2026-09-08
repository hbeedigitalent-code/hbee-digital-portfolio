// src/components/notifications/ClientNotificationBell.tsx
//
// Client-portal notification bell + popover. Batch N2-E.
//
// This is a plain client component: it talks ONLY to the N2-C API routes over
// browser fetch and never touches Supabase directly, so no service-role code,
// no anon client and no table name reaches the browser bundle. The API owns
// session authentication and resolves the caller's clients.id server-side —
// nothing here sends recipient_scope, recipient_id, user_id, user_type or
// client_id, and there is deliberately NO client-side recipient filtering: the
// server's scoped response is the security boundary, not this component.
//
// Deliberately not a poller: the unread count is fetched once on mount and
// refreshed only when the panel opens or after a mark-read action. A 401 or 404
// from the API leaves the shell intact with an empty, silent bell.

'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface ClientNotification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  entity_type: string | null
  entity_id: string | null
  recipient_scope: string
  created_at: string
  read_at: string | null
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]'

/** Short relative time. Rendered only inside the panel, which never appears
 *  during SSR, so there is no hydration mismatch from Date.now(). */
function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''

  const seconds = Math.floor((Date.now() - then) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function ClientNotificationBell() {
  const router = useRouter()
  const panelId = useId()
  const headingId = useId()

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<ClientNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  // Unread count on mount. A 401 (session expired) or 404 (no client record)
  // is swallowed into a zero badge — the portal shell must never break because
  // notifications are unavailable.
  useEffect(() => {
    let cancelled = false

    async function loadCount() {
      try {
        const response = await fetch('/api/notifications/unread-count', {
          credentials: 'same-origin',
        })
        if (!response.ok) return
        const payload = await response.json().catch(() => null)
        if (cancelled || typeof payload?.unreadCount !== 'number') return
        setUnreadCount(payload.unreadCount)
      } catch {
        /* leave the badge at its current value */
      }
    }

    loadCount()
    return () => {
      cancelled = true
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/notifications', { credentials: 'same-origin' })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !Array.isArray(payload?.notifications)) {
        setError('Could not load notifications.')
        setNotifications([])
        return
      }

      // Rendered exactly as returned. The server already scoped this to the
      // authenticated client; no filtering is repeated here.
      setNotifications(payload.notifications as ClientNotification[])
      if (typeof payload.unreadCount === 'number') setUnreadCount(payload.unreadCount)
    } catch {
      setError('Could not load notifications.')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) loadNotifications()
  }

  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) buttonRef.current?.focus()
  }, [])

  // Escape closes and returns focus to the trigger.
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  async function handleSelect(notification: ClientNotification) {
    // Already read: nothing to persist, so navigate straight away.
    if (notification.read_at) {
      if (notification.link) {
        close(false)
        router.push(notification.link)
      }
      return
    }

    // Unread: optimistically mark read, then confirm with the server.
    setPendingId(notification.id)
    setError(null)
    setNotifications((current) =>
      current.map((n) =>
        n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    )
    setUnreadCount((current) => Math.max(0, current - 1))

    let succeeded = false
    try {
      const response = await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      succeeded = response.ok
    } catch {
      succeeded = false
    }

    setPendingId(null)

    if (!succeeded) {
      // Roll the optimistic change back and stay put.
      setNotifications((current) =>
        current.map((n) => (n.id === notification.id ? { ...n, read_at: null } : n)),
      )
      setUnreadCount((current) => current + 1)
      setError('Could not update that notification.')
      return
    }

    // Navigate only once the read has actually been persisted.
    if (notification.link) {
      close(false)
      router.push(notification.link)
    }
  }

  async function markAllRead() {
    const snapshot = notifications
    const previousCount = unreadCount

    setError(null)
    setNotifications((current) =>
      current.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
    )
    setUnreadCount(0)

    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (!response.ok) {
        setNotifications(snapshot)
        setUnreadCount(previousCount)
        setError('Could not mark all as read.')
      }
    } catch {
      setNotifications(snapshot)
      setUnreadCount(previousCount)
      setError('Could not mark all as read.')
    }
  }

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={`relative p-2 rounded-lg hover:bg-[var(--bg-section)] transition ${FOCUS_RING}`}
      >
        <SvgIcon name="bell" size={20} color="var(--text-muted)" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold text-white"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-away layer — same pattern as the profile dropdown. */}
          <div className="fixed inset-0 z-40" onClick={() => close(false)} />

          <div
            id={panelId}
            role="region"
            aria-labelledby={headingId}
            className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-lg"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] p-3">
              <h2 id={headingId} className="text-sm font-bold text-[var(--text-primary)]">
                Notifications
              </h2>
              {notifications.some((n) => !n.read_at) && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className={`rounded-lg px-2 py-1 text-xs font-semibold text-[var(--accent-orange)] hover:bg-[var(--bg-section)] transition ${FOCUS_RING}`}
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {loading && (
                <p className="p-4 text-sm text-[var(--text-muted)]">Loading notifications…</p>
              )}

              {!loading && error && (
                <p role="alert" className="p-4 text-sm text-red-500">
                  {error}
                </p>
              )}

              {!loading && !error && notifications.length === 0 && (
                <p className="p-4 text-sm text-[var(--text-muted)]">You&apos;re all caught up.</p>
              )}

              {!loading &&
                !error &&
                notifications.map((notification) => {
                  const isUnread = !notification.read_at
                  const actionable = isUnread || !!notification.link

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      disabled={!actionable || pendingId === notification.id}
                      onClick={() => handleSelect(notification)}
                      className={`block w-full border-b border-[var(--border)] p-3 text-left transition last:border-0 hover:bg-[var(--bg-section)] disabled:cursor-default disabled:hover:bg-transparent ${FOCUS_RING} ${
                        isUnread ? 'bg-[var(--accent-subtle)]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {isUnread && (
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent-orange)]"
                          />
                        )}
                        <div className={isUnread ? 'min-w-0 flex-1' : 'min-w-0 flex-1 pl-4'}>
                          <p
                            className={`text-sm text-[var(--text-primary)] ${
                              isUnread ? 'font-semibold' : 'font-medium'
                            }`}
                          >
                            {notification.title}
                            <span className="sr-only">{isUnread ? ' (unread)' : ' (read)'}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {formatRelative(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
            </div>

            <div className="border-t border-[var(--border)] p-2">
              <Link
                href="/client-portal/notifications"
                onClick={() => close(false)}
                className={`block rounded-lg py-2 text-center text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-section)] transition ${FOCUS_RING}`}
              >
                View all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
