'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import SvgIcon from '@/components/ui/SvgIcon'

export default function AdminProfile() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // 2FA States
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [twoFASecret, setTwoFASecret] = useState('')
  const [twoFAToken, setTwoFAToken] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verifying2FA, setVerifying2FA] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/admin/login')
      } else {
        setUser(authUser)
        setEmail(authUser?.email || '')
        setFullName(authUser?.user_metadata?.full_name || '')
        setAvatarUrl(authUser?.user_metadata?.avatar_url || '')
        
        // Save to localStorage for navbar/sidebar to access
        if (authUser?.user_metadata?.avatar_url) {
          localStorage.setItem('admin_avatar', authUser.user_metadata.avatar_url)
        }
        if (authUser?.user_metadata?.full_name) {
          localStorage.setItem('admin_name', authUser.user_metadata.full_name)
        }
        
        // Check if 2FA is enabled — via the server route, which uses the
        // service-role key. The browser never queries admin_2fa directly
        // (it is correctly locked down by RLS and would otherwise silently
        // fail here, which is exactly the bug this replaces).
        await refreshTwoFAStatus()
      }
      setLoading(false)
    }
    getUser()
  }, [router])

  const refreshTwoFAStatus = async () => {
    try {
      const response = await fetch('/api/admin/2fa/status', { method: 'GET' })
      const result = await response.json()
      if (response.ok) {
        setTwoFAEnabled(Boolean(result.enabled))
      }
    } catch {
      // Leave the last known state on a transient network failure rather
      // than flashing an incorrect "disabled" status.
    }
  }

  const refreshUser = async () => {
    const { data: { user: refreshed } } = await supabase.auth.getUser()
    if (refreshed) {
      setUser(refreshed)
      setFullName(refreshed.user_metadata?.full_name || '')
      setAvatarUrl(refreshed.user_metadata?.avatar_url || '')
      
      // Update localStorage
      if (refreshed.user_metadata?.avatar_url) {
        localStorage.setItem('admin_avatar', refreshed.user_metadata.avatar_url)
      }
      if (refreshed.user_metadata?.full_name) {
        localStorage.setItem('admin_name', refreshed.user_metadata.full_name)
      }
      
      // Dispatch event for navbar/sidebar to update
      window.dispatchEvent(new Event('adminProfileUpdate'))
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 2MB' })
      return
    }

    setUploading(true)
    setMessage(null)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl, full_name: fullName }
      })
      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      await refreshUser()
      setMessage({ type: 'success', text: 'Profile picture updated!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload image' })
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setUploading(true)
    setMessage(null)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null, full_name: fullName }
      })
      if (updateError) throw updateError

      setAvatarUrl('')
      await refreshUser()
      setMessage({ type: 'success', text: 'Profile picture removed!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to remove image' })
    } finally {
      setUploading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_url: avatarUrl }
      })
      if (updateError) throw updateError

      await refreshUser()
      setMessage({ type: 'success', text: 'Profile updated!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setMessage({ type: 'success', text: 'Password updated!' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update password' })
    } finally {
      setSaving(false)
    }
  }

  // 2FA Setup Functions
  const setup2FA = async () => {
    setMessage(null)
    try {
      // No userId/email in the body — the server derives the acting admin
      // from the current session, never from browser-supplied values.
      const response = await fetch('/api/admin/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      if (data.success) {
        setQrCode(data.qrCode)
        setTwoFASecret(data.secret)
        setShow2FASetup(true)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to setup 2FA' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to setup 2FA' })
    }
  }

  const verify2FA = async () => {
    if (!twoFAToken || twoFAToken.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit code' })
      return
    }

    setVerifying2FA(true)
    setMessage(null)

    try {
      // Only the code is sent — the server derives the acting admin from the
      // current session, never from a browser-supplied userId.
      const response = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: twoFAToken }),
      })
      const data = await response.json()
      if (data.success) {
        setBackupCodes(data.backupCodes)
        setTwoFAEnabled(true)
        setShow2FASetup(false)
        setTwoFAToken('')
        setMessage({ type: 'success', text: '2FA enabled successfully! Save your backup codes.' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Invalid verification code' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to verify 2FA' })
    } finally {
      setVerifying2FA(false)
    }
  }

  const disable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) return

    setSaving(true)
    try {
      // Routed through a protected server endpoint — admin_2fa is correctly
      // locked down by RLS, so a direct browser write here would silently
      // fail (that silent failure was the original bug this replaces).
      const response = await fetch('/api/admin/2fa/disable', { method: 'POST' })
      const result = await response.json()

      if (!result.success) throw new Error(result.error || 'Failed to disable 2FA')

      setTwoFAEnabled(false)
      setMessage({ type: 'success', text: '2FA disabled successfully' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disable 2FA' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-black text-[var(--text-primary)]">Admin Profile</h2>

      {message && (
        <div className={`flex items-center gap-2 rounded-xl border p-4 text-sm ${
          message.type === 'success' 
            ? 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]' 
            : 'border-red-500/20 bg-red-500/10 text-red-400'
        }`}>
          <SvgIcon name={message.type === 'success' ? 'verified' : 'error'} size={16} color={message.type === 'success' ? 'var(--accent)' : '#f87171'} />
          {message.text}
        </div>
      )}

      {/* 2FA Setup Modal */}
      {show2FASetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-black text-[var(--text-primary)]">Setup Two-Factor Authentication</h3>
              <button onClick={() => setShow2FASetup(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
            </div>
            
            {!backupCodes.length ? (
              <>
                <div className="mb-4 rounded-lg bg-[var(--bg-section)] p-4 text-center">
                  {qrCode && <img src={qrCode} alt="2FA QR Code" className="mx-auto mb-3 w-48 rounded-lg" />}
                  {twoFASecret && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Secret Key: <span className="font-mono font-bold text-[var(--accent)]">{twoFASecret}</span>
                    </p>
                  )}
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    1. Scan the QR code with Google Authenticator or Authy
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    2. Enter the 6-digit code below to verify
                  </p>
                </div>
                
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Verification Code</label>
                  <input
                    type="text"
                    value={twoFAToken}
                    onChange={(e) => setTwoFAToken(e.target.value)}
                    maxLength={6}
                    placeholder="000000"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] px-4 py-3 text-center text-2xl tracking-wider text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                    autoFocus
                  />
                </div>
                
                <button
                  onClick={verify2FA}
                  disabled={verifying2FA || twoFAToken.length !== 6}
                  className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] disabled:opacity-50"
                >
                  {verifying2FA ? 'Verifying...' : 'Verify & Enable 2FA'}
                </button>
              </>
            ) : (
              <div>
                <div className="mb-4 rounded-lg bg-green-500/10 p-4 text-center">
                  <SvgIcon name="verified" size={32} color="var(--accent)" className="mx-auto mb-3" />
                  <p className="font-bold text-[var(--accent)]">2FA Enabled Successfully!</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">Save these backup codes in a safe place:</p>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-[var(--bg-section)] p-4">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="rounded bg-[var(--bg-card)] px-2 py-1 text-center font-mono text-sm">{code}</code>
                  ))}
                </div>
                <button
                  onClick={() => setShow2FASetup(false)}
                  className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02]"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Section */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="mb-6 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-orange)] text-3xl font-bold text-white">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span>{fullName ? fullName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-[var(--bg-card)] p-1.5 shadow-md transition hover:scale-105">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} ref={fileInputRef} />
                <SvgIcon name="edit" size={14} color="var(--accent)" />
              </label>
            </div>
            {uploading && <p className="text-sm text-[var(--accent)]">Uploading...</p>}
            {avatarUrl && (
              <button onClick={handleRemoveAvatar} className="text-sm text-red-400 transition hover:text-red-300" disabled={uploading}>
                Remove Photo
              </button>
            )}
            <p className="text-center text-xs text-[var(--text-muted)]">Click camera icon to upload<br />JPG, PNG, GIF (max 2MB)</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Full Name</label>
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50" 
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Email</label>
              <input type="email" value={email} disabled className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-muted)]" />
              <p className="mt-1 text-xs text-[var(--text-muted)]">Email cannot be changed</p>
            </div>
            <button type="submit" disabled={saving} className="w-full rounded-full bg-[var(--accent)] py-2.5 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] disabled:opacity-50">
              {saving ? 'Saving...' : 'Update Profile'}
            </button>
          </form>
        </div>

        {/* Security Section */}
        <div className="space-y-6">
          {/* Change Password */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--text-primary)]">
              <SvgIcon name="security" size={18} color="var(--accent)" />
              Change Password
            </h3>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">New Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50" 
                  minLength={6} 
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50" 
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" disabled={saving} className="w-full rounded-full border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-black text-red-400 transition hover:bg-red-500/20">
                {saving ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </div>

          {/* Two-Factor Authentication */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-black text-[var(--text-primary)]">
                <SvgIcon name="shield" size={18} color="var(--accent)" />
                Two-Factor Authentication
              </h3>
              {twoFAEnabled && (
                <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs font-bold text-green-400">Enabled</span>
              )}
            </div>
            
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              {twoFAEnabled 
                ? 'Two-factor authentication is enabled. Your account is more secure.'
                : 'Add an extra layer of security to your account by enabling two-factor authentication.'}
            </p>
            
            {twoFAEnabled ? (
              <button
                onClick={disable2FA}
                disabled={saving}
                className="w-full rounded-full border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-black text-red-400 transition hover:bg-red-500/20"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                onClick={setup2FA}
                className="w-full rounded-full bg-gradient-orange-green py-2.5 text-sm font-black text-white transition hover:scale-[1.02]"
              >
                Enable Two-Factor Authentication
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}