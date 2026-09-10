// src/app/client-confirmation/page.tsx

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'
import { motion } from 'framer-motion'

function ConfirmationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [title, setTitle] = useState('')
  // A partial provisioning failure is shown explicitly. Confirmation itself
  // still succeeded, so this is a notice alongside the success state rather
  // than an error that replaces it.
  const [setupIncomplete, setSetupIncomplete] = useState(false)

  useEffect(() => {
    async function handleConfirmation() {
      const confirmed = searchParams.get('confirmed')
      const error = searchParams.get('error')
      // /api/auth/confirm sets this when the email verified but the client or
      // merchant record could not be created.
      const setup = searchParams.get('setup')

      // Check for error first
      if (error) {
        setStatus('error')
        setTitle('Confirmation Failed')
        const errorMessages: Record<string, string> = {
          missing_token: 'The confirmation link is missing a token. Please request a new one.',
          verification_failed: 'We couldn\'t verify your email. The link may have expired.',
          unknown: 'An unknown error occurred. Please try again.',
          server_error: 'A server error occurred. Please try again later.'
        }
        setMessage(errorMessages[error] || 'An error occurred during confirmation.')
        return
      }

      // Check if confirmed successfully
      if (confirmed === 'true') {
        setStatus('success')
        setTitle('Email Confirmed! ✅')
        setMessage('Your email has been confirmed! You can now log in to your account.')

        if (setup === 'incomplete') setSetupIncomplete(true)

        // Account provisioning is server-side now.
        //
        // This block used to insert the clients row straight from the browser.
        // After the access lockdown that write is not permitted, and it never
        // created the merchant_accounts record at all.
        //
        // POST /api/account/provision verifies the session and provisions the
        // CALLER'S OWN records from their verified auth record. It takes no
        // parameters, so nothing about identity, status, verification or
        // merchant links can be influenced from here. It is idempotent, so it
        // is harmless when /api/auth/confirm has already provisioned during
        // the redirect, and safe to retry.
        try {
          const response = await fetch('/api/account/provision', {
            method: 'POST',
            credentials: 'same-origin',
          })

          // 401 simply means this page was reached without a session — the
          // server-side confirmation route already did the work. Anything else
          // is a real partial failure and must be surfaced, not swallowed.
          if (!response.ok && response.status !== 401) {
            setSetupIncomplete(true)
          }
        } catch (err) {
          console.error('Account setup error:', err)
          setSetupIncomplete(true)
        }
        return
      }

      // Check if user is already confirmed
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email_confirmed_at) {
          setStatus('success')
          setTitle('Already Confirmed ✅')
          setMessage('Your email is already confirmed. You can log in to your account.')
          return
        }
      } catch (err) {
        // User not logged in, that's fine
      }

      // No confirmation status - show loading or request new
      setStatus('error')
      setTitle('No Confirmation Found')
      setMessage('We couldn\'t find a confirmation request. Please request a new confirmation email.')
    }

    handleConfirmation()
  }, [searchParams, supabase])

  const handleResendConfirmation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage('Please log in first to request a new confirmation email.')
        return
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email!,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/client-confirmation`,
        }
      })

      if (error) {
        setMessage('Failed to resend confirmation email. Please try again later.')
        return
      }

      setMessage('A new confirmation email has been sent. Please check your inbox.')
    } catch (err) {
      setMessage('An error occurred. Please try again later.')
    }
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--accent-orange)] border-t-transparent" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Confirming Your Email...</h1>
        <p className="mt-2 text-[var(--text-secondary)]">Please wait while we verify your account.</p>
      </div>
    )
  }

  // Success state
  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="rounded-full bg-[var(--accent-lime)]/10 p-4 mx-auto w-24 h-24 flex items-center justify-center mb-6"
        >
          <SvgIcon name="check" size={48} color="var(--accent-lime)" />
        </motion.div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">{title}</h1>
        <p className="mt-3 text-lg text-[var(--text-secondary)]">{message}</p>

        {/* A partial provisioning failure is stated plainly. The old code
            logged it and showed an unqualified success. */}
        {setupIncomplete && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-[var(--warning)] bg-[var(--warning-subtle)] p-4 text-left"
          >
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Your account setup did not finish
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Your email is confirmed and you can log in, but part of your account
              record was not created. Please contact support so we can complete it.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/client-login"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-orange)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] hover:scale-[1.02]"
          >
            <SvgIcon name="log-in" size={18} color="white" />
            Log In Now
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-transparent px-8 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-section)]"
          >
            <SvgIcon name="home" size={18} />
            Go to Homepage
          </Link>
        </div>
      </motion.div>
    )
  }

  // Error state
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <div className="rounded-full bg-red-500/10 p-4 mx-auto w-24 h-24 flex items-center justify-center mb-6">
        <SvgIcon name="warning" size={48} color="#ef4444" />
      </div>
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">{title}</h1>
      <p className="mt-3 text-[var(--text-secondary)]">{message}</p>
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleResendConfirmation}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-orange)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] hover:scale-[1.02]"
        >
          <SvgIcon name="email" size={18} color="white" />
          Resend Confirmation
        </button>
        <Link
          href="/client-login"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-transparent px-8 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-section)]"
        >
          <SvgIcon name="log-in" size={18} />
          Go to Login
        </Link>
      </div>
      <div className="mt-4">
        <Link
          href="/contact"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-orange)] transition"
        >
          Need help? Contact Support
        </Link>
      </div>
    </motion.div>
  )
}

export default function ClientConfirmationPage() {
  return (
    <>
      <main className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-[var(--bg-page)] px-4 py-20">
        <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 md:p-12 shadow-[var(--shadow-lg)]">
          <Suspense fallback={
            <div className="flex justify-center items-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
            </div>
          }>
            <ConfirmationContent />
          </Suspense>
        </div>
      </main>
    </>
  )
}