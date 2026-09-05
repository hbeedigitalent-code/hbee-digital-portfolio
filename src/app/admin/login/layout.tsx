'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface NavItem {
  name: string
  href: string
  icon: string
  badge?: number
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadInquiries, setUnreadInquiries] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser()
      if (!data.user && pathname !== '/admin/login') {
        router.push('/admin/login')
      } else {
        setUser(data.user)
      }
      setLoading(false)
    }
    checkAuth()
  }, [pathname, router])

  useEffect(() => {
    async function fetchUnread() {
      const { count } = await supabase
        .from('contact_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
      setUnreadInquiries(count || 0)
    }
    if (user) fetchUnread()
  }, [user, pathname])

  async function handleLogout() {
    // NOTE: this layout only wraps /admin/login, and its own early return
    // below (`if (pathname === '/admin/login') return <>{children}</>`)
    // means the sidebar containing this button never actually renders here.
    // Updated for consistency with admin/layout.tsx regardless.
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } catch {
      // Non-fatal — proceed with sign-out regardless.
    }
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: 'analytics' },
    { name: 'Inquiries', href: '/admin/inquiries', icon: 'email', badge: unreadInquiries },
    { name: 'Hero Section', href: '/admin/hero', icon: 'hero' },
    { name: 'About Page', href: '/admin/about', icon: 'about' },
    { name: 'Services', href: '/admin/services', icon: 'services' },
    { name: 'Pricing', href: '/admin/pricing', icon: 'pricing' },
    { name: 'Portfolio', href: '/admin/portfolio', icon: 'portfolio' },
    { name: 'Blog Posts', href: '/admin/blog', icon: 'blog' },
    { name: 'Testimonials', href: '/admin/testimonials', icon: 'star' },
    { name: 'Team Members', href: '/admin/team', icon: 'team' },
    { name: 'FAQ', href: '/admin/faq', icon: 'faq' },
    { name: 'Navigation Menu', href: '/admin/menu', icon: 'menu' },
    { name: 'Footer', href: '/admin/footer', icon: 'footer' },
    { name: 'Profile', href: '/admin/profile', icon: 'profile' },
    { name: 'Settings', href: '/admin/settings', icon: 'settings' },
  ]

  const currentPage = navItems.find((item) => item.href === pathname)?.name || 'Admin Dashboard'

  if (pathname === '/admin/login') return <>{children}</>

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-8 py-6 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm font-bold text-[var(--text-secondary)]">Loading Admin...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute left-0 top-0 h-[520px] w-[520px] rounded-full bg-[var(--accent)]/8 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[480px] w-[520px] rounded-full bg-[var(--accent-lime)]/5 blur-[140px]" />
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <button onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-30 bg-black/75 backdrop-blur-sm lg:hidden" />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 z-40 flex h-full flex-col border-r border-[var(--border)] bg-[var(--bg-card)]/96 backdrop-blur-2xl transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-20'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="border-b border-[var(--border)] p-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/10">
                <SvgIcon name="logo" size={20} color="var(--accent)" />
              </span>
              {sidebarOpen && (
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">Hbee Digitals</span>
                  <span className="block truncate text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Admin Studio</span>
                </span>
              )}
            </Link>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-section)] transition hover:border-[var(--accent)]/25 lg:flex">
              {sidebarOpen ? '‹' : '›'}
            </button>
            <button onClick={() => setMobileMenuOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-section)] lg:hidden">×</button>
          </div>

          {sidebarOpen && (
            <div className="mt-4 rounded-xl border border-[var(--accent)]/18 bg-[var(--accent)]/8 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Lead Status</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-secondary)]">New inquiries</span>
                <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-black text-[var(--btn-primary-text)]">{unreadInquiries}</span>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href
            const badgeCount = Number(item.badge || 0)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${active ? 'border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--text-primary)]' : 'border border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:bg-[var(--bg-section)]'}`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${active ? 'border-[var(--accent)]/22 bg-[var(--accent)]/10' : 'border-[var(--border)] bg-[var(--bg-section)]'}`}>
                  <SvgIcon name={item.icon} size={16} color={active ? 'var(--accent)' : 'var(--text-muted)'} />
                </span>
                {sidebarOpen && <span className="flex-1 truncate text-sm font-bold">{item.name}</span>}
                {badgeCount > 0 && (
                  <span className={`rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-black text-[var(--btn-primary-text)] ${sidebarOpen ? 'ml-auto' : 'absolute -right-1 -top-1'}`}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-4">
          {sidebarOpen && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--accent)]/18 bg-[var(--accent)]/10">
                <SvgIcon name="profile" size={14} color="var(--accent)" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black">Admin User</p>
                <p className="truncate text-[10px] text-[var(--text-muted)]">{user?.email}</p>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className={`flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 py-2 text-sm font-black text-red-300 transition hover:bg-red-400/15 ${sidebarOpen ? '' : 'px-2'}`}>
            <SvgIcon name="logout" size={14} color="#f87171" />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`min-h-screen transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-20'}`}>
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-page)]/88 px-5 py-3 backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setMobileMenuOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-section)] lg:hidden">☰</button>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Hbee Digitals CMS</p>
                <h1 className="truncate text-base font-black">{currentPage}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/inquiries" className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-section)] transition hover:border-[var(--accent)]/25">
                <SvgIcon name="email" size={16} color="var(--text-muted)" />
                {unreadInquiries > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-black text-[var(--btn-primary-text)]">{unreadInquiries > 9 ? '9+' : unreadInquiries}</span>}
              </Link>
              <div className="relative">
                <button onClick={() => setProfileOpen(!profileOpen)} className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] px-3 transition hover:border-[var(--accent)]/25">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)] text-[10px] font-black text-[var(--btn-primary-text)]">{user?.email?.charAt(0)?.toUpperCase() || 'A'}</span>
                  <span className="hidden text-xs font-bold text-[var(--text-secondary)] md:block">Admin</span>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-lg)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Signed in as</p>
                    <p className="mt-1 break-words text-xs font-bold">{user?.email}</p>
                    <Link href="/admin/profile" onClick={() => setProfileOpen(false)} className="mt-2 block rounded-lg border border-[var(--border)] px-3 py-2 text-center text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-section)]">Profile Settings</Link>
                    <button onClick={handleLogout} className="mt-2 w-full rounded-lg border border-red-400/25 bg-red-400/10 py-2 text-xs font-black text-red-300 hover:bg-red-400/15">Logout</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-5 lg:p-6">{children}</div>
      </main>
    </div>
  )
}