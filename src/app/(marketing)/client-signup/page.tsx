// src/app/client-signup/page.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

const industries = [
  'Fashion & Apparel', 'Beauty & Cosmetics', 'Health & Wellness',
  'Home & Living', 'Electronics', 'Jewelry', 'Pet Products',
  'Food & Beverage', 'Automotive', 'Digital Products', 'Other'
]

const countries = [
  'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'France', 'Italy', 'Spain', 'Netherlands',
  'New Zealand', 'Other'
]

export default function ClientSignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    password: '',
    confirm_password: '',
    whatsapp: '',
    website_url: '',
    country: '',
    industry: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    // Clear error when user types
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const { createMerchantAccount } = await import('@/lib/services/merchant-auth-service')
      
      const result = await createMerchantAccount({
        business_name: formData.business_name,
        contact_name: formData.contact_name,
        email: formData.email,
        password: formData.password,
        whatsapp: formData.whatsapp,
        website_url: formData.website_url,
        country: formData.country,
        industry: formData.industry,
      })

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/client-login')
        }, 4000)
      } else {
        setError(result.error || 'Failed to create account')
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError('Service unavailable. Please try again later.')
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
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Account Created! 🎉</h1>
            <p className="mt-3 text-[var(--text-secondary)]">
              Your merchant account has been created. Please check your email to confirm your account.
            </p>
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-4">
              <p className="text-sm text-[var(--text-muted)]">
                📧 We've sent a confirmation email to <strong className="text-[var(--text-primary)]">{formData.email}</strong>
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/client-login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-orange)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] hover:scale-[1.02]"
              >
                <SvgIcon name="log-in" size={18} color="white" />
                Go to Login
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-transparent px-8 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-section)]"
              >
                <SvgIcon name="home" size={18} />
                Return to Homepage
              </Link>
            </div>
            <p className="mt-4 text-sm text-[var(--text-muted)]">
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
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Create Account</h1>
            <p className="mt-2 text-[var(--text-secondary)]">Join Hbee Digitals as a merchant</p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-md)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Business Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)] transition"
                  placeholder="Your business name"
                />
              </div>

              {/* Contact Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                  Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)] transition"
                  placeholder="Your full name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)] transition"
                  placeholder="you@email.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)] transition pr-12"
                    placeholder="Min 6 characters"
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

              {/* Confirm Password */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)] transition pr-12"
                    placeholder="Confirm your password"
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

              {/* WhatsApp */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                  WhatsApp <span className="text-sm text-[var(--text-muted)]">(Optional)</span>
                </label>
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)] transition"
                  placeholder="+1 234 567 8900"
                />
              </div>

              {/* Website URL */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                  Website URL <span className="text-sm text-[var(--text-muted)]">(Optional)</span>
                </label>
                <input
                  type="url"
                  name="website_url"
                  value={formData.website_url}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)] transition"
                  placeholder="https://yourstore.com"
                />
              </div>

              {/* Country & Industry */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    Country
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)] transition"
                  >
                    <option value="">Select country</option>
                    {countries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    Industry
                  </label>
                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)] transition"
                  >
                    <option value="">Select industry</option>
                    {industries.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Error Message */}
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[var(--accent-orange)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating Account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Already have an account?{' '}
                <Link href="/client-login" className="text-[var(--accent-orange)] hover:underline font-medium">
                  Login
                </Link>
              </p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="text-[var(--accent-orange)] hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-[var(--accent-orange)] hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <SvgIcon name="verified" size={14} color="var(--accent-lime)" />
              Secure & Private
            </span>
            <span className="flex items-center gap-1.5">
              <SvgIcon name="shield" size={14} color="var(--accent-orange)" />
              Data Protected
            </span>
            <span className="flex items-center gap-1.5">
              <SvgIcon name="support" size={14} color="var(--blue-500)" />
              24/7 Support
            </span>
          </div>
        </motion.div>
      </main>
    </>
  )
}