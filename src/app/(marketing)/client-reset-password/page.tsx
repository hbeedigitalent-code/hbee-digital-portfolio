// src/app/client-reset-password/page.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'

export default function ClientResetPasswordPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push('/client-login?reset=success')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <>
        <main className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-[var(--bg-page)] px-4 pt-28 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="rounded-full bg-[var(--accent-lime)]/10 p-4 mx-auto w-24 h-24 flex items-center justify-center mb-6"
            >
              <SvgIcon name="check" size={48} color="var(--accent-lime)" />
            </motion.div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Password Reset! ✅</h1>
            <p className="mt-3 text-[var(--text-secondary)]">
              Your password has been reset successfully.
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Redirecting to login in a few seconds...
            </p>
          </motion.div>
        </main>
      </>
    )
  }

  return (
    <>
      <main className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-[var(--bg-page)] px-4 pt-28 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Reset Password</h1>
            <p className="mt-2 text-[var(--text-secondary)]">Enter your new password</p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-md)]">
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)] transition pr-12"
                    placeholder="Min 6 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <SvgIcon 
                      name={showPassword ? 'eye-off' : 'eye'} 
                      size={20} 
                      color="var(--text-muted)" 
                    />
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)] transition pr-12"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <SvgIcon 
                      name={showConfirmPassword ? 'eye-off' : 'eye'} 
                      size={20} 
                      color="var(--text-muted)" 
                    />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-500"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[var(--accent-orange)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Resetting...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Remember your password?{' '}
                <a href="/client-login" className="text-[var(--accent-orange)] hover:underline font-medium">
                  Back to Login
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </>
  )
}