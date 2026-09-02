'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  /** true while the theme still follows the OS setting (no explicit user choice stored) */
  isSystem: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'theme'

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function applyTheme(next: Theme) {
  document.documentElement.classList.toggle('dark', next === 'dark')
  document.documentElement.setAttribute('data-theme', next)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [isSystem, setIsSystem] = useState(true)

  // Resolve the initial theme: an explicit saved choice always wins; otherwise
  // the site defaults to dark for first-time visitors.
  useEffect(() => {
    const stored = readStoredTheme()
    const resolved: Theme = stored ?? 'dark'

    setTheme(resolved)
    setIsSystem(stored === null)
    applyTheme(resolved)
  }, [])

  // Until the user makes an explicit choice, still respond to OS theme changes
  // (the dark default only sets the starting point).
  useEffect(() => {
    if (!isSystem) return

    let mql: MediaQueryList
    try {
      mql = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return
    }

    const onChange = (event: MediaQueryListEvent) => {
      const next: Theme = event.matches ? 'dark' : 'light'
      setTheme(next)
      applyTheme(next)
    }

    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [isSystem])

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'

    setTheme(next)
    setIsSystem(false)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage unavailable (private mode, etc.) — theme still applies for this session */
    }
    applyTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isSystem }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
