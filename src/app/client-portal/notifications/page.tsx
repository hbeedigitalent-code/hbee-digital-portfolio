// src/app/client-portal/notifications/page.tsx
//
// Client-portal notification inbox. Batch N2-E.
//
// Authorization is NOT re-implemented here. This page sits under
// /client-portal/*, so middleware.ts already enforces an authenticated session
// before it renders, and GET /api/notifications independently re-verifies the
// session and resolves the caller's clients.id server-side, returning only that
// client's rows. This page is a plain client component that calls that API and
// nothing else — it never queries Supabase and never sends recipient_scope,
// recipient_id, user_id, user_type or client_id.
//
// Internal fields (recipient_id, user_id, user_type, idempotency_key,
// is_legacy) are not returned by the API and are never rendered.

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

export default function ClientNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<ClientNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/notifications', { credentials: 'same-origin' })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !Array.isArray(payload?.notifications)) {
        console.error(
          'Error fetching notifications:',
          payload?.error || `Request failed with status ${response.status}`
        )
        setError('Could not load notifications. Please refresh and try again.')
        setNotifications([])
        return
      }

      setNotifications(payload.notifications as ClientNotification[])
      if (typeof payload.unreadCount === 'number') setUnreadCount(payload.unreadCount)
    } catch (err) {
      console.error('Error:', err)
      setError('Could not load notifications. Please refresh and try again.')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  async function handleSelect(notification: ClientNotification) {
    if (notification.read_at) {
      if (notification.link) router.push(notification.link)
      return
    }

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
      setNotifications((current) =>
        current.map((n) => (n.id === notification.id ? { ...n, read_at: null } : n)),
      )
      setUnreadCount((current) => current + 1)
      setError('Could not update that notification.')
      return
    }

    if (notification.link) router.push(notification.link)
  }

  async function handleMarkAll() {
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

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Notifications</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAll}
            className={`rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-section)] transition ${FOCUS_RING}`}
          >
            Mark all as read
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        {notifications.length === 0 && !error ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center p-6 text-center">
            <SvgIcon name="bell" size={40} color="var(--text-muted)" />
            <p className="mt-3 font-medium text-[var(--text-primary)]">No notifications yet</p>
            <p className="text-sm text-[var(--text-muted)]">
              Updates about your projects, files and invoices will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {notifications.map((notification) => {
              const isUnread = !notification.read_at
              const actionable = isUnread || !!notification.link

              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    disabled={!actionable || pendingId === notification.id}
                    onClick={() => handleSelect(notification)}
                    className={`block w-full p-4 text-left transition hover:bg-[var(--bg-section)] disabled:cursor-default disabled:hover:bg-transparent ${FOCUS_RING} ${
                      isUnread ? 'bg-[var(--accent-subtle)]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={`mt-2 h-2 w-2 flex-shrink-0 rounded-full ${
                          isUnread ? 'bg-[var(--accent-orange)]' : 'bg-transparent'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm text-[var(--text-primary)] ${
                            isUnread ? 'font-semibold' : 'font-medium'
                          }`}
                        >
                          {notification.title}
                          <span className="sr-only">{isUnread ? ' (unread)' : ' (read)'}</span>
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {notification.message}
                        </p>
                        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                          {formatTimestamp(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
