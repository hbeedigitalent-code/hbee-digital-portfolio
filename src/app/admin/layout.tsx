// src/app/admin/layout.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadInquiries, setUnreadInquiries] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const [adminAvatar, setAdminAvatar] = useState('')
  const [adminName, setAdminName] = useState('')
  const [siteSettings, setSiteSettings] = useState<any>({})

  // Update the navItems array to include Growth Reviews and Proposals

const navItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: 'analytics' },
  { name: 'Workspace', href: '/admin/workspace', icon: 'dashboard' },
  { name: 'Growth Assessments', href: '/admin/growth-assessments', icon: 'growth-readiness' },
  // NEW - Growth Reviews
  { name: 'Growth Reviews', href: '/admin/growth-reviews', icon: 'eye' },
  // NEW - Growth Profiles
  { name: 'Growth Profiles', href: '/admin/growth-profiles', icon: 'growth-profile' },
  { name: 'Client Onboarding', href: '/admin/client-onboarding', icon: 'users' },
  { name: 'CRM / Leads', href: '/admin/crm', icon: 'user' },
  { name: 'Client Portal', href: '/admin/client-portal', icon: 'portfolio' },
  { name: 'Projects', href: '/admin/projects', icon: 'projects' },
  { name: 'Tasks', href: '/admin/tasks', icon: 'check' },
  // Proposals already exists - keep it
  { name: 'Proposals', href: '/admin/proposals', icon: 'pricing' },
  { name: 'Agreements', href: '/admin/agreements', icon: 'security' },
  { name: 'Client Health', href: '/admin/client-health', icon: 'growth' },
  { name: 'Growth Intelligence', href: '/admin/growth-intelligence', icon: 'analytics' },
  { name: 'Audits', href: '/admin/growth-intelligence/audits', icon: 'search' },
  { name: 'Opportunities', href: '/admin/growth-intelligence/opportunities', icon: 'growth' },
  { name: 'Blog Posts', href: '/admin/blog', icon: 'blog' },
  { name: 'Blog Categories', href: '/admin/blog/categories', icon: 'category' },
  { name: 'Comments', href: '/admin/comments', icon: 'messages' },
  { name: 'FAQs', href: '/admin/faqs', icon: 'faq' },
  { name: 'Testimonials', href: '/admin/testimonials', icon: 'star' },
  { name: 'Hero Section', href: '/admin/hero', icon: 'hero' },
  { name: 'About Page', href: '/admin/about', icon: 'about' },
  { name: 'Services', href: '/admin/services', icon: 'services' },
  { name: 'Pricing', href: '/admin/pricing', icon: 'pricing' },
  { name: 'Portfolio', href: '/admin/portfolio', icon: 'portfolio' },
  { name: 'Team Members', href: '/admin/team', icon: 'team' },
  { name: 'Before/After', href: '/admin/before-after', icon: 'image' },
  { name: 'Inquiries', href: '/admin/inquiries', icon: 'email', badge: unreadInquiries },
  { name: 'Newsletter', href: '/admin/newsletter', icon: 'newsletter' },
  { name: 'Subscribers', href: '/admin/subscribers', icon: 'users' },
  { name: 'Navigation Menu', href: '/admin/menu', icon: 'menu' },
  { name: 'Merchants', href: '/admin/merchants', icon: 'users' },
  { name: 'Profile', href: '/admin/profile', icon: 'profile' },
  { name: 'Settings', href: '/admin/settings', icon: 'settings' },
]

  useEffect(() => {
    async function fetchData() {
      const { data: site } = await supabase.from('site_settings').select('*').single()
      if (site) setSiteSettings(site)
    }
    fetchData()

    async function checkAuth() {
      const { data } = await supabase.auth.getUser()
      
      // If on login page, don't check admin
      if (pathname === '/admin/login') {
        setLoading(false)
        return
      }
      
      // If not logged in → redirect to login
      if (!data.user) {
        router.push('/admin/login')
        setLoading(false)
        return
      }
      
      // ✅ Check if user is admin using hardcoded emails + database check
      if (data.user) {
        const isAdmin = await checkIsAdmin(data.user)
        
        if (!isAdmin) {
          router.push('/client-portal')
          setLoading(false)
          return
        }
        
        setIsAuthorized(true)
        setUser(data.user)
        const avatar = data.user?.user_metadata?.avatar_url || siteSettings?.logo_url || ''
        const name = data.user?.user_metadata?.full_name || siteSettings?.site_name || 'Admin'
        setAdminAvatar(avatar)
        setAdminName(name)
        
        if (avatar) localStorage.setItem('admin_avatar', avatar)
        if (name) localStorage.setItem('admin_name', name)
      }
      
      setLoading(false)
    }
    checkAuth()

    async function fetchUnread() {
      const { count } = await supabase
        .from('contact_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
      setUnreadInquiries(count || 0)
    }
    fetchUnread()

    const handleProfileUpdate = () => {
      const avatar = localStorage.getItem('admin_avatar') || siteSettings?.logo_url || ''
      const name = localStorage.getItem('admin_name') || siteSettings?.site_name || 'Admin'
      setAdminAvatar(avatar)
      setAdminName(name)
    }
    window.addEventListener('adminProfileUpdate', handleProfileUpdate)
    return () => window.removeEventListener('adminProfileUpdate', handleProfileUpdate)
  }, [pathname, router, siteSettings])

  async function checkIsAdmin(user: any): Promise<boolean> {
    // Database check only — the hardcoded-email fallback has been removed.
    // Admin status is resolved exclusively through admin_users, matching
    // middleware.ts (the authoritative access boundary).
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
      
      if (error) {
        console.error('⚠️ Admin check error:', error)
        return false
      }
      
      if (data) {
        console.log('✅ Admin found via database:', data.email)
        return true
      }
    } catch (err) {
      console.error('⚠️ Admin check exception:', err)
    }
    
    return false
  }

  async function handleLogout() {
    // Clear the httpOnly 2FA-verified cookie server-side first — client JS
    // cannot delete an httpOnly cookie itself — then end the Supabase session.
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } catch {
      // Non-fatal: proceed with sign-out regardless, so a network blip never
      // traps the admin in a logged-in-but-can't-log-out state.
    }
    await supabase.auth.signOut()
    localStorage.removeItem('admin_avatar')
    localStorage.removeItem('admin_name')
    router.push('/admin/login')
  }

  // If on login page, don't render sidebar
  if (pathname === '/admin/login') return <>{children}</>
  
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-[var(--bg-page)]">Loading...</div>
  if (!user || !isAuthorized) return null

  const avatarLetter = adminName ? adminName.charAt(0).toUpperCase() : 'A'
  const companyLogo = siteSettings?.logo_url || ''
  const companyName = siteSettings?.site_name || 'Hbee Digitals'

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-page)]">
      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex lg:flex-col ${sidebarOpen ? 'w-72' : 'w-20'} bg-[var(--bg-card)] border-r border-[var(--border)] transition-all duration-300 flex-shrink-0`}>
        {/* Logo */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              {companyLogo ? (
                <img 
                  src={companyLogo} 
                  alt={companyName} 
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{companyName.charAt(0)}</span>
                </div>
              )}
              {sidebarOpen && <span className="font-bold text-[var(--text-primary)]">{companyName}</span>}
            </Link>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </div>

        {/* SCROLLABLE NAVIGATION */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition mb-1 ${
                pathname === item.href
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-section)] hover:text-[var(--text-primary)]'
              } ${!sidebarOpen ? 'justify-center' : ''}`}
            >
              <SvgIcon 
                name={item.icon} 
                size={18} 
                color={pathname === item.href ? 'white' : 'var(--text-muted)'} 
              />
              {sidebarOpen && <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{item.name}</span>}
              {item.badge && item.badge > 0 && sidebarOpen && (
                <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Footer with Logout Button */}
        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-400/20 bg-red-400/10 text-red-400 font-bold text-sm hover:bg-red-400/20 transition"
          >
            <SvgIcon name="logout" size={16} color="#ef4444" />
            {sidebarOpen && <span className="text-sm text-red-400">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-card)]/95 backdrop-blur-2xl px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-section)]"
              >
                <SvgIcon name="menu" size={20} color="var(--text-primary)" />
              </button>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">
                {navItems.find(i => i.href === pathname)?.name || 'Dashboard'}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/admin/inquiries" className="relative">
                <SvgIcon name="bell" size={20} color="var(--text-muted)" />
                {unreadInquiries > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadInquiries > 99 ? '99+' : unreadInquiries}
                  </span>
                )}
              </Link>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-[var(--bg-section)] transition"
                >
                  {adminAvatar ? (
                    <img 
                      src={adminAvatar} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold">
                      {avatarLetter}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-[var(--text-primary)]">{adminName}</span>
                  <SvgIcon name="chevron-down" size={14} color="var(--text-muted)" className="hidden sm:block" />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 z-50 shadow-lg">
                      <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">Signed in as</p>
                      <p className="mt-1 text-xs font-bold text-[var(--text-primary)] break-words">{user?.email}</p>
                      <Link 
                        href="/admin/profile" 
                        onClick={() => setProfileOpen(false)}
                        className="block mt-3 text-center text-xs font-bold text-[var(--text-primary)] py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-section)]"
                      >
                        Profile Settings
                      </Link>
                      <button 
                        onClick={handleLogout}
                        className="w-full mt-2 py-2 rounded-lg border border-red-400/20 bg-red-400/10 text-red-400 font-bold text-xs hover:bg-red-400/20 transition flex items-center justify-center gap-2"
                      >
                        <SvgIcon name="logout" size={14} color="#ef4444" />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[var(--bg-page)]">
          {children}
        </div>
      </div>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/75 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 w-72 h-full bg-[var(--bg-card)] border-r border-[var(--border)] z-50 flex flex-col lg:hidden">
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
              <div className="flex items-center gap-2">
                {companyLogo ? (
                  <img src={companyLogo} alt={companyName} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{companyName.charAt(0)}</span>
                  </div>
                )}
                <span className="font-bold text-[var(--text-primary)]">{companyName}</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-[var(--text-muted)] text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition mb-1 ${
                    pathname === item.href
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-section)]'
                  }`}
                >
                  <SvgIcon 
                    name={item.icon} 
                    size={18} 
                    color={pathname === item.href ? 'white' : 'var(--text-muted)'} 
                  />
                  <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{item.name}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
            <div className="p-4 border-t border-[var(--border)]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-400/20 bg-red-400/10 text-red-400 font-bold text-sm hover:bg-red-400/20 transition"
              >
                <SvgIcon name="logout" size={16} color="#ef4444" />
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}