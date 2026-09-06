// src/app/client-portal/settings/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'

export default function ClientSettingsPage() {
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    business_name: '',
    email: '',
    whatsapp: '',
    website_url: '',
    country: '',
    profile_image: '',
    notification_preferences: {
      email_notifications: true,
      project_updates: true,
      marketing_emails: false,
    }
  })

  useEffect(() => {
    fetchClient()
  }, [])

  async function fetchClient() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
        setClient(clientData)
        setFormData({
          full_name: clientData.full_name || '',
          business_name: clientData.business_name || '',
          email: clientData.email || '',
          whatsapp: clientData.whatsapp || '',
          website_url: clientData.website_url || '',
          country: clientData.country || '',
          profile_image: clientData.profile_image || '',
          notification_preferences: {
            email_notifications: clientData.email_notifications !== false,
            project_updates: clientData.project_updates !== false,
            marketing_emails: clientData.marketing_emails || false,
          }
        })
      } else {
        console.warn('⚠️ No client profile found for user:', user.id)
      }
    }

    setLoading(false)
  }

  async function handleProfileImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !client) return

    setUploading(true)
    setMessage(null)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${client.user_id}-${Date.now()}.${fileExt}`
      const filePath = `profile-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('client-portal')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('client-portal')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('clients')
        .update({ profile_image: urlData.publicUrl })
        .eq('user_id', client.user_id)

      if (updateError) throw updateError

      setFormData({ ...formData, profile_image: urlData.publicUrl })
      setMessage({ type: 'success', text: 'Profile image updated successfully!' })
      
      await fetchClient()
      window.dispatchEvent(new Event('clientProfileUpdate'))
    } catch (error) {
      console.error('Upload error:', error)
      setMessage({ type: 'error', text: 'Failed to upload image. Please try again.' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          full_name: formData.full_name,
          business_name: formData.business_name,
          whatsapp: formData.whatsapp,
          website_url: formData.website_url,
          country: formData.country,
          email_notifications: formData.notification_preferences.email_notifications,
          project_updates: formData.notification_preferences.project_updates,
          marketing_emails: formData.notification_preferences.marketing_emails,
        })
        .eq('user_id', client.user_id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      await fetchClient()
      window.dispatchEvent(new Event('clientProfileUpdate'))
    } catch (error) {
      console.error('Update error:', error)
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  const avatarLetter = formData.full_name ? formData.full_name.charAt(0).toUpperCase() : 'C'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Profile Settings</h2>
        <p className="text-sm text-[var(--text-secondary)]">Manage your account information and preferences.</p>
      </div>

      {message && (
        <div className={`rounded-xl border p-4 text-sm font-bold ${
          message.type === 'error' 
            ? 'border-red-500/20 bg-red-500/10 text-red-400' 
            : 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]'
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile Photo */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--text-primary)]">
          <SvgIcon name="user" size={18} color="var(--accent)" />
          Profile Photo
        </h3>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent)] text-4xl font-bold text-white overflow-hidden">
              {formData.profile_image ? (
                <img
                  src={formData.profile_image}
                  alt="Profile"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                avatarLetter
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 rounded-full bg-[var(--accent)] p-2 text-white hover:opacity-80 disabled:opacity-50 transition"
            >
              <SvgIcon name="edit" size={16} color="white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfileImageUpload}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-lg font-medium text-[var(--text-primary)]">{formData.full_name || 'Client'}</p>
            <p className="text-sm text-[var(--text-muted)]">{formData.email}</p>
            {uploading && <p className="text-sm text-[var(--text-muted)] mt-1">Uploading...</p>}
            <p className="text-xs text-[var(--text-muted)] mt-2">Click the edit icon to change your profile photo</p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--text-primary)]">
          <SvgIcon name="profile" size={18} color="var(--accent)" />
          Personal Information
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="settings-full-name" className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Full Name</label>
              <input
                id="settings-full-name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label htmlFor="settings-business-name" className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Business Name</label>
              <input
                id="settings-business-name"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="Your business name"
              />
            </div>
            <div>
              <label htmlFor="settings-email" className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Email Address</label>
              <input
                id="settings-email"
                value={formData.email}
                disabled
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5 text-[var(--text-muted)] cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">Email cannot be changed</p>
            </div>
            <div>
              <label htmlFor="settings-whatsapp" className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">WhatsApp</label>
              <input
                id="settings-whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="+1 234 567 8900"
              />
            </div>
            <div>
              <label htmlFor="settings-website" className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Website</label>
              <input
                id="settings-website"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="https://yourstore.com"
              />
            </div>
            <div>
              <label htmlFor="settings-country" className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Country</label>
              <input
                id="settings-country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="Your country"
              />
            </div>
          </div>
          <div className="mt-6 flex gap-3 pt-6 border-t border-[var(--border)]">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[var(--accent)] px-8 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--text-primary)]">
          <SvgIcon name="bell" size={18} color="var(--accent)" />
          Notification Preferences
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p id="notif-email-notifications" className="font-medium text-[var(--text-primary)]">Email Notifications</p>
              <p className="text-sm text-[var(--text-muted)]">Receive updates about your projects via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                aria-labelledby="notif-email-notifications"
                checked={formData.notification_preferences.email_notifications}
                onChange={(e) => setFormData({
                  ...formData,
                  notification_preferences: {
                    ...formData.notification_preferences,
                    email_notifications: e.target.checked
                  }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--bg-section)] peer-focus:ring-2 peer-focus:ring-[var(--accent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p id="notif-project-updates" className="font-medium text-[var(--text-primary)]">Project Updates</p>
              <p className="text-sm text-[var(--text-muted)]">Get notified when your projects are updated</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                aria-labelledby="notif-project-updates"
                checked={formData.notification_preferences.project_updates}
                onChange={(e) => setFormData({
                  ...formData,
                  notification_preferences: {
                    ...formData.notification_preferences,
                    project_updates: e.target.checked
                  }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--bg-section)] peer-focus:ring-2 peer-focus:ring-[var(--accent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p id="notif-marketing-emails" className="font-medium text-[var(--text-primary)]">Marketing Emails</p>
              <p className="text-sm text-[var(--text-muted)]">Receive marketing and promotional emails</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                aria-labelledby="notif-marketing-emails"
                checked={formData.notification_preferences.marketing_emails}
                onChange={(e) => setFormData({
                  ...formData,
                  notification_preferences: {
                    ...formData.notification_preferences,
                    marketing_emails: e.target.checked
                  }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--bg-section)] peer-focus:ring-2 peer-focus:ring-[var(--accent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--text-primary)]">
          <SvgIcon name="security" size={18} color="var(--accent)" />
          Account Information
        </h3>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-[var(--text-secondary)]">Account Status</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="font-medium text-[var(--text-primary)]">Active</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-secondary)]">Member Since</p>
            <p className="mt-1 font-medium text-[var(--text-primary)]">
              {client?.created_at ? new Date(client.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Recently'}
            </p>
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-secondary)]">Account ID</p>
            <p className="mt-1 font-mono text-sm text-[var(--text-primary)]">
              {client?.id?.slice(0, 8) || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}