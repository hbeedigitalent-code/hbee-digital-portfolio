import type { Config } from 'tailwindcss'

/**
 * Hbee Digitals — single canonical Tailwind configuration (Phase 02).
 *
 * The old `tailwind.config.js` (which was the active one) has been removed.
 * Colour/spacing/radius/shadow values live as CSS custom properties in
 * `src/app/globals.css`; this file only exposes them to Tailwind's utility
 * generator. Dark mode is class/attribute based (never `media`).
 *
 * Tailwind's default palette (gray, blue, orange, green, red, …) and default
 * scales (fontSize, spacing, borderRadius, boxShadow) are intentionally left
 * intact for backwards compatibility — Phase 02 only ADDS tokens.
 */
const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── Semantic tokens (Phase 02) ── */
        bg: 'var(--bg)',
        'bg-subtle': 'var(--bg-subtle)',
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        'bg-inverse': 'var(--bg-inverse)',

        ink: 'var(--text)',
        'ink-secondary': 'var(--text-secondary)',
        'ink-muted': 'var(--text-muted)',
        'ink-inverse': 'var(--text-on-inverse)',

        line: 'var(--border)',
        'line-strong': 'var(--border-strong)',

        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          subtle: 'var(--accent-subtle)',
        },
        cta: {
          DEFAULT: 'var(--cta)',
          hover: 'var(--cta-hover)',
          text: 'var(--cta-text)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',

        /* ── Legacy compatibility (migrate away in Phase 03+) ── */
        navy: {
          600: 'var(--navy-600)',
          700: 'var(--navy-700)',
          800: 'var(--navy-800)',
          900: 'var(--navy-900)',
          DEFAULT: 'var(--navy-900)',
        },
        primary: {
          DEFAULT: 'var(--accent)',
          light: '#60A5FA',
          dark: 'var(--bg-inverse)',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        heading: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        /* semantic additions — Tailwind defaults (xs…9xl) are untouched */
        display: ['var(--fs-display)', { lineHeight: 'var(--lh-display)', letterSpacing: 'var(--ls-display)', fontWeight: '700' }],
        h1: ['var(--fs-h1)', { lineHeight: 'var(--lh-h1)', letterSpacing: 'var(--ls-h1)', fontWeight: '700' }],
        h2: ['var(--fs-h2)', { lineHeight: 'var(--lh-h2)', letterSpacing: 'var(--ls-h2)', fontWeight: '600' }],
        h3: ['var(--fs-h3)', { lineHeight: 'var(--lh-h3)', letterSpacing: 'var(--ls-h3)', fontWeight: '600' }],
        h4: ['var(--fs-h4)', { lineHeight: 'var(--lh-h4)', letterSpacing: 'var(--ls-h4)', fontWeight: '600' }],
        'body-lg': ['var(--fs-body-lg)', { lineHeight: 'var(--lh-body-lg)' }],
        'body-sm': ['var(--fs-body-sm)', { lineHeight: 'var(--lh-body-sm)' }],
        eyebrow: ['var(--fs-eyebrow)', { lineHeight: 'var(--lh-eyebrow)', letterSpacing: 'var(--ls-eyebrow)', fontWeight: '600' }],
        caption: ['var(--fs-caption)', { lineHeight: 'var(--lh-caption)' }],
      },
      borderRadius: {
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
        large: 'var(--radius-large)',
      },
      boxShadow: {
        'elevation-sm': 'var(--shadow-sm)',
        'elevation-md': 'var(--shadow-md)',
        'elevation-lg': 'var(--shadow-lg)',
      },
      maxWidth: {
        container: 'var(--container)',
        'container-wide': 'var(--container-wide)',
      },
      spacing: {
        section: 'var(--space-section)',
        'section-compact': 'var(--space-section-compact)',
        'gutter-mobile': 'var(--gutter-mobile)',
        'gutter-tablet': 'var(--gutter-tablet)',
        'gutter-desktop': 'var(--gutter-desktop)',
      },
      ringColor: {
        DEFAULT: 'var(--ring)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
      },
      transitionDuration: {
        hover: '150ms',
        press: '100ms',
        entrance: '300ms',
        reveal: '400ms',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
        'spin-slow': 'spin 20s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
