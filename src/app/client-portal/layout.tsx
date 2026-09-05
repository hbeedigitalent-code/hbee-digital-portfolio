// src/app/client-portal/layout.tsx

'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'
import ThemeToggle from '@/components/ThemeToggle'

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const navItems = [
    { name: 'Dashboard', href: '/client-portal', icon: 'dashboard' },
    { name: 'Growth Profile', href: '/client-portal/growth-profile', icon: 'growth-readiness' },
    { name: 'Projects', href: '/client-portal/projects', icon: 'projects' },
    { name: 'Files', href: '/client-portal/files', icon: 'file' },
    { name: 'Requests', href: '/client-portal/requests', icon: 'messages' },
    { name: 'Deliverables', href: '/client-portal/deliverables', icon: 'download' },
    { name: 'Invoices', href: '/client-portal/invoices', icon: 'pricing' },
    { name: 'Settings', href: '/client-portal/settings', icon: 'settings' },
  ]

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/client-login')
        return
      }

      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
        setClient(clientData)
      }

      setLoading(false)
    }

    checkAuth()

    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [router, supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/client-login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-page)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-page)]">
        <div className="text-center">
          <p className="text-[var(--text-muted)]">No client profile found. Please contact support.</p>
        </div>
      </div>
    )
  }

  const avatarLetter = client.full_name ? client.full_name.charAt(0).toUpperCase() : 'C'

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-page)]">
      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex lg:flex-col ${sidebarOpen ? 'w-72' : 'w-20'} bg-[var(--bg-card)] border-r border-[var(--border)] transition-all duration-300 flex-shrink-0`}>
        {/* Logo */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <Link href="/client-portal" className="flex items-center gap-2">
              <SvgIcon name="logo" size={32} color="var(--accent)" />
              {sidebarOpen && <span className="font-bold text-[var(--text-primary)]">Client Portal</span>}
            </Link>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </div>

        {/* Client Info */}
        {sidebarOpen && (
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                {client.profile_image ? (
                  <img src={client.profile_image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  avatarLetter
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)] truncate">{client.full_name}</p>
                {client.business_name && (
                  <p className="text-xs text-[var(--text-muted)] truncate">{client.business_name}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
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
              {sidebarOpen && <span className="flex-1 text-sm font-medium">{item.name}</span>}
            </Link>
          ))}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-400/20 bg-red-400/10 text-red-400 font-bold text-sm hover:bg-red-400/20 transition"
          >
            <SvgIcon name="logout" size={16} color="#ef4444" />
            {sidebarOpen && 'Logout'}
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
              <ThemeToggle />

              {/* Notification */}
              <button className="relative p-2 rounded-lg hover:bg-[var(--bg-section)] transition">
                <SvgIcon name="bell" size={20} color="var(--text-muted)" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-[var(--bg-section)] transition"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                    {client.profile_image ? (
                      <img src={client.profile_image} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      avatarLetter
                    )}
                  </div>
                  <span className="hidden sm:block text-sm text-[var(--text-primary)]">{client.full_name}</span>
                  <SvgIcon name="chevron-down" size={14} color="var(--text-muted)" className="hidden sm:block" />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 z-50 shadow-lg">
                      <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">Signed in as</p>
                      <p className="mt-1 text-xs font-bold text-[var(--text-primary)] break-words">{client.email}</p>
                      <Link 
                        href="/client-portal/settings" 
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

        {/* Content */}
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
                <SvgIcon name="logo" size={28} color="var(--accent)" />
                <span className="font-bold text-[var(--text-primary)]">Client Portal</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-[var(--text-muted)] text-xl">✕</button>
            </div>

            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                  {client.profile_image ? (
                    <img src={client.profile_image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    avatarLetter
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">{client.full_name}</p>
                  {client.business_name && (
                    <p className="text-xs text-[var(--text-muted)] truncate">{client.business_name}</p>
                  )}
                </div>
              </div>
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
                  <span className="flex-1 text-sm font-medium">{item.name}</span>
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