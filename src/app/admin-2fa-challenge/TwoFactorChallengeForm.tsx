// src/app/admin-2fa-challenge/TwoFactorChallengeForm.tsx
'use client'

import { useEffect, useState } from 'react'
import SvgIcon from '@/components/ui/SvgIcon'

// Imports only the shared SvgIcon primitive — nothing from src/app/admin/
// (no sidebar, header, nav, or dashboard data). This form has never depended
// on the admin shell; the shell-leak bug was the route's file-system
// nesting under admin/layout.tsx, fixed by this route living outside it.

type Phase = 'checking' | 'code-required' | 'error'

export default function TwoFactorChallengeForm({ next }: { next: string }) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function checkStatus() {
      try {
        const response = await fetch('/api/admin/2fa/status', { method: 'GET' })
        const result = await response.json()

        if (cancelled) return

        if (!response.ok) {
          setError(result.error || 'Unable to verify your account status.')
          setPhase('error')
          return
        }

        if (result.ready) {
          // 2FA is not enabled for this account — the server already stamped
          // the verified cookie. Hard-navigate so middleware re-evaluates
          // this request with the fresh cookie present.
          window.location.href = next
          return
        }

        // 2FA is enabled — collect the code.
        setPhase('code-required')
      } catch {
        if (!cancelled) {
          setError('Unable to reach the server. Please try again.')
          setPhase('error')
        }
      }
    }

    checkStatus()
    return () => {
      cancelled = true
    }
  }, [next])

  async function handleVerify() {
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/admin/2fa/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code }),
      })

      const result = await response.json()

      if (result.success) {
        window.location.href = next
        return
      }

      setError(result.error || 'Invalid verification code.')
    } catch {
      setError('Failed to verify code. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const brandMark = (
    <div className="mb-6 flex items-center justify-center gap-2">
      <SvgIcon name="logo" size={22} color="var(--accent)" />
      <span className="text-sm font-black tracking-tight text-[var(--text-primary)]">Hbee Digitals</span>
    </div>
  )

  if (phase === 'checking') {
    return (
      <div className="w-full max-w-md text-center">
        {brandMark}
        <div className="h-10 w-10 mx-auto animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        <p className="mt-4 text-sm text-[var(--text-muted)]">Checking your account...</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="w-full max-w-md">
        {brandMark}
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <SvgIcon name="error" size={32} color="#f87171" className="mx-auto mb-3" />
          <p className="font-bold text-red-400">{error}</p>
          <a
            href="/admin/login"
            className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline"
          >
            Back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      {brandMark}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 shadow-lg">
          <SvgIcon name="security" size={32} color="var(--accent)" />
        </div>
        <h1 className="text-2xl font-black text-[var(--text-primary)]">Two-Factor Authentication</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Enter the code from your authenticator app</p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-lg)]">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Authentication Code</label>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.length === 6 && !submitting) handleVerify()
              }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-3 text-center text-2xl tracking-wider text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={submitting || code.length !== 6}
            className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] disabled:opacity-50"
          >
            {submitting ? 'Verifying...' : 'Verify & Continue'}
          </button>

          <div className="text-center">
            <a href="/admin/login" className="text-sm text-[var(--accent)] hover:underline">
              ← Back to login
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
