'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import ThemeToggle from '@/components/ThemeToggle'
import SvgIcon from '@/components/ui/SvgIcon'
import ConsultationPopup from '@/components/ConsultationPopup'

interface NavLink {
  label: string
  href: string
  icon?: string
  description?: string
}

interface NavGroup extends NavLink {
  children?: NavLink[]
}

const fallbackMenu: NavGroup[] = [
  {
    label: 'Services',
    href: '/services',
    icon: 'services',
    children: [
      {
        label: 'Web Development',
        href: '/services/web-development',
        icon: 'web-development',
        description: 'Modern, responsive websites built with cutting-edge technology.',
      },
      {
        label: 'UI/UX Design',
        href: '/services/ui-ux-design',
        icon: 'ui-ux',
        description: 'Beautiful, intuitive interfaces that users love.',
      },
      {
        label: 'E-Commerce Solutions',
        href: '/services/ecommerce',
        icon: 'ecommerce',
        description: 'Complete online store solutions with seamless user experiences.',
      },
      {
        label: 'Digital Marketing',
        href: '/services/digital-marketing',
        icon: 'digital-marketing',
        description: 'Reach your target audience effectively.',
      },
      {
        label: 'Brand Strategy',
        href: '/services/brand-strategy',
        icon: 'branding',
        description: 'Comprehensive branding solutions for strong market presence.',
      },
      {
        label: 'Technical Consulting',
        href: '/services/technical-consulting',
        icon: 'consulting',
        description: 'Expert guidance on technology stack and architecture.',
      },
      {
        label: 'SEO Optimization',
        href: '/services/seo',
        icon: 'seo',
        description: 'Improve search rankings and drive organic traffic.',
      },
      {
        label: 'PPC Management',
        href: '/services/ppc',
        icon: 'ppc',
        description: 'Data-driven ad campaigns for maximum ROI.',
      },
    ],
  },
  {
    label: 'Portfolio',
    href: '/portfolio',
    icon: 'portfolio',
    children: [
      {
        label: 'All Case Studies',
        href: '/portfolio',
        icon: 'portfolio',
        description: 'Browse selected stores, websites, and growth systems.',
      },
      {
        label: 'Before & After',
        href: '/before-after',
        icon: 'verified',
        description: 'See visual before and after redesigns focused on trust.',
      },
      {
        label: 'Client Reviews',
        href: '/reviews',
        icon: 'star',
        description: 'See testimonials from Hbee Digitals projects.',
      },
    ],
  },
  {
    label: 'Company',
    href: '/about',
    icon: 'about',
    children: [
      {
        label: 'About Us',
        href: '/about',
        icon: 'about',
        description: 'Learn about Hbee Digitals and how we work.',
      },
      {
        label: 'Our Process',
        href: '/process',
        icon: 'rocket',
        description: 'See how we move from audit to launch.',
      },
    ],
  },
  {
    label: 'Resources',
    href: '/blog',
    icon: 'blog',
    children: [
      {
        label: 'Blog',
        href: '/blog',
        icon: 'blog',
        description: 'Insights on Shopify, websites, branding, and growth.',
      },
      {
        label: 'Pricing',
        href: '/pricing',
        icon: 'pricing',
        description: 'View our service packages and pricing options.',
      },
      {
        label: 'FAQ',
        href: '/faq',
        icon: 'faq',
        description: 'Answers to common questions about our services.',
      },
      {
        label: 'Privacy Policy',
        href: '/privacy',
        icon: 'security',
        description: 'How we handle information and privacy.',
      },
    ],
  },
  { label: 'Contact', href: '/contact', icon: 'email' },
]

function isActiveRoute(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function isGroupActive(pathname: string, group: NavGroup) {
  if (isActiveRoute(pathname, group.href)) return true
  return group.children?.some((child) => isActiveRoute(pathname, child.href)) || false
}

function cleanHref(href: string) {
  if (href === '/faqs') return '/faq'
  return href
}

function LogoMark({
  logoUrl,
  siteName,
  size = 'small',
  onError,
}: {
  logoUrl: string
  siteName: string
  size?: 'small' | 'large'
  onError: () => void
}) {
  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center ${
        size === 'large' ? 'h-12 w-12' : 'h-11 w-11'
      }`}
    >
      <img
        src={logoUrl}
        alt={`${siteName} logo`}
        className={`object-contain ${
          size === 'large' ? 'h-8 w-8' : 'h-7 w-7'
        }`}
        onError={onError}
      />
    </span>
  )
}

export default function Navbar() {
  const pathname = usePathname()
  const reducedMotion = useReducedMotion()

  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showNavbar, setShowNavbar] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isChatDropdownOpen, setIsChatDropdownOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({})
  const [menuItems, setMenuItems] = useState<NavGroup[]>(fallbackMenu)
  const [siteName, setSiteName] = useState('Hbee Digitals')
  const [logoUrl, setLogoUrl] = useState('/svgs/logo.svg')
  const [isConsultationOpen, setIsConsultationOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const lastScrollY = useRef(0)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatDropdownRef = useRef<HTMLDivElement>(null)

  // Per-group horizontal offset + width for the desktop submenu so it always
  // stays inside the viewport (Portfolio / Company / Resources sit near the
  // right edge). Computed from the trigger's live position, not a fixed offset.
  const submenuTriggerRefs = useRef<Record<string, HTMLLIElement | null>>({})
  const [submenuBoxes, setSubmenuBoxes] = useState<Record<string, { left: number; width: number }>>({})

  const positionSubmenu = useCallback((label: string) => {
    const el = submenuTriggerRefs.current[label]
    if (!el || typeof window === 'undefined') return

    const rect = el.getBoundingClientRect()
    const viewportWidth = document.documentElement.clientWidth
    const EDGE_MARGIN = 16 // min gap kept from either viewport edge
    const MAX_WIDTH = 880

    const width = Math.min(MAX_WIDTH, viewportWidth - EDGE_MARGIN * 2)
    const triggerCenter = rect.left + rect.width / 2
    const idealLeft = triggerCenter - width / 2
    const clampedLeft = Math.max(
      EDGE_MARGIN,
      Math.min(idealLeft, viewportWidth - EDGE_MARGIN - width),
    )

    // `left` is relative to the trigger <li> (the positioned offset parent).
    setSubmenuBoxes((prev) => ({ ...prev, [label]: { left: clampedLeft - rect.left, width } }))
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Re-clamp the open submenu when the window resizes.
  useEffect(() => {
    if (!openDropdown) return
    const onResize = () => positionSubmenu(openDropdown)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [openDropdown, positionSubmenu])

  const desktopMenu = useMemo(() => {
    const coreLabels = ['Services', 'Portfolio', 'Company', 'Resources', 'Contact']
    const enhanced = fallbackMenu.map((fallback) => {
      const matched = menuItems.find(
        (item) => item.label.toLowerCase() === fallback.label.toLowerCase() || item.href === fallback.href
      )
      return { ...fallback, href: matched?.href ? cleanHref(matched.href) : fallback.href }
    })
    const extraItems = menuItems.filter(
      (item) =>
        !coreLabels.includes(item.label) &&
        !['/reviews', '/before-after', '/pricing'].includes(cleanHref(item.href)) &&
        !['reviews', 'before & after', 'pricing'].includes(item.label.toLowerCase()) &&
        !enhanced.some((nav) => nav.href === cleanHref(item.href))
    )
    return [...enhanced, ...extraItems]
  }, [menuItems])

  const handleMouseEnter = (label: string) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    positionSubmenu(label)
    setOpenDropdown(label)
  }

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => setOpenDropdown(null), 50)
  }

  const toggleMobileSubmenu = (label: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }))
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (chatDropdownRef.current && !chatDropdownRef.current.contains(event.target as Node)) {
        setIsChatDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY
        const scrollingDown = currentY > lastScrollY.current
        setScrolled(currentY > 24)
        if (!isMobileMenuOpen && !openDropdown && !isChatDropdownOpen) {
          if (currentY < 90) {
            setShowNavbar(true)
          } else if (scrollingDown && currentY > 180) {
            setShowNavbar(false)
          } else if (!scrollingDown) {
            setShowNavbar(true)
          }
        }
        lastScrollY.current = currentY
        ticking = false
      })
      ticking = true
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isMobileMenuOpen, openDropdown, isChatDropdownOpen])

  useEffect(() => {
    async function fetchData() {
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('label, href')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      if (menuData?.length) {
        setMenuItems(
          menuData
            .filter((item) => {
              const label = item.label.toLowerCase()
              const href = cleanHref(item.href)
              return label !== 'home' && label !== 'faqs' && href !== '/home'
            })
            .map((item) => ({ label: item.label, href: cleanHref(item.href) }))
        )
      }
      const { data: settings } = await supabase.from('site_settings').select('*').single()
      if (settings) {
        if (settings.site_name) setSiteName(settings.site_name)
        if (settings.logo_url?.trim()) setLogoUrl(settings.logo_url.trim())
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
    setExpandedMenus({})
    setOpenDropdown(null)
    setIsChatDropdownOpen(false)
    setShowNavbar(true)
  }, [pathname])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false)
        setExpandedMenus({})
        setOpenDropdown(null)
        setIsChatDropdownOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
      setShowNavbar(true)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMobileMenuOpen])

  const phoneNumberDisplay = '815-315-3827'
  const phoneNumberFull = '+234-815-315-3827'

  if (!mounted) {
    return (
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-[var(--border)]/70 bg-[var(--bg-card)]/80 px-3 py-2.5 backdrop-blur-sm shadow-[var(--shadow-sm)] sm:px-4 md:px-5">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-[var(--bg-section)] lg:hidden" />
            <div className="flex items-center gap-2">
              <div className="h-11 w-11 rounded-2xl bg-[var(--bg-section)]" />
              <div className="hidden h-4 w-24 rounded bg-[var(--bg-section)] sm:block" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--bg-section)]" />
          </div>
        </nav>
      </header>
    )
  }

  return (
    <>
      <motion.header
        initial={reducedMotion ? false : { y: -72, opacity: 0 }}
        animate={{
          y: showNavbar ? 0 : -95,
          opacity: showNavbar ? 1 : 0,
        }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
        onMouseEnter={() => setShowNavbar(true)}
      >
        <nav
          aria-label="Main navigation"
          className={`mx-auto flex max-w-7xl items-center justify-between rounded-full border px-3 py-2.5 transition-all duration-300 sm:px-4 md:px-5 ${
            scrolled
              ? 'border-[var(--border)] bg-[var(--bg-section)] shadow-[var(--shadow-md)]'
              : 'border-[var(--border)]/70 bg-[var(--bg-card)]/80 backdrop-blur-sm shadow-[var(--shadow-sm)]'
          }`}
        >
          {/* Left Section: Logo + Hamburger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--bg-card-hover)] lg:hidden"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {isMobileMenuOpen ? (
                <SvgIcon name="close" size={22} color="var(--text-primary)" />
              ) : (
                <SvgIcon name="menu" size={22} color="var(--text-primary)" />
              )}
            </button>

            <Link href="/" className="flex items-center gap-2">
              <LogoMark
                logoUrl={logoUrl}
                siteName={siteName}
                onError={() => setLogoUrl('/svgs/logo.svg')}
              />
              <span className="hidden text-sm font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:block">
                {siteName}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation - Centered dropdown submenus */}
          <LayoutGroup>
            <ul className="hidden items-center gap-1 lg:flex">
              {desktopMenu.map((link) => {
                const active = isGroupActive(pathname, link)
                const hasChildren = Boolean(link.children?.length)
                const isOpen = openDropdown === link.label

                return (
                  <li
                    key={`${link.label}-${link.href}`}
                    ref={(el) => {
                      submenuTriggerRefs.current[link.label] = el
                    }}
                    className="relative"
                    onMouseEnter={() => hasChildren && handleMouseEnter(link.label)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <Link
                      href={link.href}
                      className={`relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="relative z-10">{link.label}</span>
                      {hasChildren && (
                        <SvgIcon
                          name="chevron-down"
                          size={12}
                          color={active ? 'var(--accent-orange)' : 'var(--text-muted)'}
                          className={`relative z-10 transition duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      )}
                      {active && (
                        <motion.span
                          layoutId="active-nav-pill"
                          className="absolute inset-0 rounded-full border border-[var(--accent-orange)]/24 bg-[var(--accent-orange)]/10"
                        />
                      )}
                    </Link>

                    <AnimatePresence>
                      {hasChildren && isOpen && (
                        <motion.div
                          initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={reducedMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          // Viewport-clamped submenu — horizontal offset is measured
                          // from the trigger so it never overflows the right edge.
                          className="absolute top-[calc(100%+14px)] z-50"
                          style={{
                            left: submenuBoxes[link.label]?.left ?? 0,
                            width: submenuBoxes[link.label]?.width ?? 880,
                          }}
                        >
                          <div className="w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-xl)]">
                            <div className="grid grid-cols-2 gap-5">
                              {link.children?.map((child) => (
                                <Link
                                  key={`${child.label}-${child.href}`}
                                  href={child.href}
                                  className="group flex gap-4 rounded-xl p-4 transition hover:bg-[var(--bg-section)]"
                                >
                                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent-orange)]/10 transition group-hover:bg-[var(--accent-orange)]/20">
                                    <SvgIcon name={child.icon || 'services'} size={22} color="var(--accent-orange)" />
                                  </span>
                                  <div className="flex-1">
                                    <p className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-orange)] transition-colors">
                                      {child.label}
                                    </p>
                                    {child.description && (
                                      <p className="mt-1 text-sm leading-5 text-[var(--text-muted)] line-clamp-2">
                                        {child.description}
                                      </p>
                                    )}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                )
              })}
            </ul>
          </LayoutGroup>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            <a
              href={`tel:${phoneNumberFull.replace(/\D/g, '')}`}
              className="hidden items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors lg:flex"
            >
              <SvgIcon name="phone" size={16} color="#2563EB" />
              {phoneNumberDisplay}
            </a>

            <Link
              href="/contact"
              className="group hidden items-center gap-2 rounded-full bg-[var(--accent-orange)] px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-[var(--orange-600)] lg:inline-flex"
            >
              Get Free Audit
              <SvgIcon name="arrow-diagonal" size={16} color="white" />
            </Link>

            <div className="flex items-center">
              <ThemeToggle />
            </div>

            {/* Mobile Chat Support Icon */}
            <div className="relative lg:hidden" ref={chatDropdownRef}>
              <button
                type="button"
                onClick={() => setIsChatDropdownOpen(!isChatDropdownOpen)}
                className="inline-flex items-center justify-center transition hover:opacity-80"
                aria-label="Chat Support"
              >
                <img 
                  src="/svgs/chat-support.svg" 
                  alt="Chat Support" 
                  width="22" 
                  height="22" 
                  style={{ filter: 'brightness(0) saturate(100%) invert(12%) sepia(89%) saturate(2500%) hue-rotate(210deg) brightness(0.95)' }}
                />
              </button>

              <AnimatePresence>
                {isChatDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-2 shadow-[var(--shadow-lg)]"
                  >
                    <button
                      onClick={() => {
                        setIsConsultationOpen(true)
                        setIsChatDropdownOpen(false)
                      }}
                      className="flex w-full items-center gap-3 rounded-xl p-3 transition hover:bg-[var(--bg-section)] group"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 transition group-hover:bg-blue-100">
                        <SvgIcon name="email" size={18} color="#2563EB" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-blue-600">Free Consultation</p>
                        <p className="text-xs text-[var(--text-muted)]">Get expert advice</p>
                      </div>
                    </button>

                    <a
                      href={`tel:${phoneNumberFull.replace(/\D/g, '')}`}
                      className="flex items-center justify-between rounded-xl p-3 transition hover:bg-[var(--bg-section)] group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-orange)]/10 transition group-hover:bg-[var(--accent-orange)]/20">
                          <SvgIcon name="phone" size={18} color="#2563EB" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">Call Us</p>
                          <p className="text-xs text-blue-600 font-medium">{phoneNumberDisplay}</p>
                        </div>
                      </div>
                      <SvgIcon name="arrow-diagonal" size={14} color="var(--accent-orange)" />
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu overlay"
              onClick={() => setIsMobileMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />

            <motion.div
              initial={{ opacity: 0, x: -320 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -320 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 top-0 z-50 w-80 overflow-y-auto bg-[var(--bg-card)] shadow-[var(--shadow-xl)] lg:hidden"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] p-4">
                <div className="flex items-center gap-2">
                  <LogoMark
                    logoUrl={logoUrl}
                    siteName={siteName}
                    size="large"
                    onError={() => setLogoUrl('/svgs/logo.svg')}
                  />
                  <span className="text-base font-semibold text-[var(--text-primary)]">{siteName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--bg-section)]"
                >
                  <SvgIcon name="close" size={20} color="var(--text-primary)" />
                </button>
              </div>

              <div className="p-4 space-y-1">
                {desktopMenu.map((item) => {
                  const hasChildren = Boolean(item.children?.length)
                  const isExpanded = expandedMenus[item.label]
                  const active = isGroupActive(pathname, item)

                  if (hasChildren) {
                    return (
                      <div key={item.label} className="border-b border-[var(--border)] last:border-0">
                        <button
                          type="button"
                          onClick={() => toggleMobileSubmenu(item.label)}
                          className={`flex w-full items-center justify-between py-4 text-left transition hover:text-[var(--accent-orange)] ${
                            active ? 'text-[var(--accent-orange)]' : 'text-[var(--text-primary)]'
                          }`}
                        >
                          <span className="text-base font-semibold">{item.label}</span>
                          <SvgIcon 
                            name="chevron-down" 
                            size={18} 
                            color={active ? 'var(--accent-orange)' : 'var(--text-muted)'}
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="pb-3 pl-4 space-y-2 border-l-2 border-[var(--accent-orange)]/20 ml-2">
                                <Link
                                  href={item.href}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="flex items-center gap-2 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent-orange)] transition group"
                                >
                                  <SvgIcon name="dashboard" size={14} color="var(--text-muted)" className="group-hover:text-[var(--accent-orange)]" />
                                  <span className="group-hover:translate-x-1 transition-transform">Overview</span>
                                </Link>
                                {item.children?.map((child) => (
                                  <Link
                                    key={child.label}
                                    href={child.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-2 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent-orange)] transition group"
                                  >
                                    <SvgIcon name={child.icon || 'services'} size={14} color="var(--text-muted)" className="group-hover:text-[var(--accent-orange)]" />
                                    <span className="group-hover:translate-x-1 transition-transform">{child.label}</span>
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between border-b border-[var(--border)] py-4 text-base font-semibold transition hover:text-[var(--accent-orange)] group ${
                        active ? 'text-[var(--accent-orange)]' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="group-hover:translate-x-1 transition-transform">{item.label}</span>
                      <SvgIcon name="arrow-right" size={16} color={active ? 'var(--accent-orange)' : 'var(--text-muted)'} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )
                })}
              </div>

              <div className="sticky bottom-0 border-t border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
                <a
                  href={`tel:${phoneNumberFull.replace(/\D/g, '')}`}
                  className="flex items-center justify-center gap-2 rounded-full bg-[var(--bg-section)] py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-card-hover)] hover:text-[var(--accent-orange)]"
                >
                  <SvgIcon name="phone" size={16} color="#2563EB" />
                  {phoneNumberDisplay}
                </a>
                
                <Link
                  href="/contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full bg-[var(--accent-orange)] py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-[var(--orange-600)]"
                >
                  Get Free Audit
                  <SvgIcon name="arrow-right" size={14} color="white" />
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConsultationPopup isOpen={isConsultationOpen} onClose={() => setIsConsultationOpen(false)} />
    </>
  )
}