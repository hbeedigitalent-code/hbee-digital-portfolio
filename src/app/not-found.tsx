import type { Metadata } from 'next'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

// A 404 must never be indexed. Next.js already injects its own
// `<meta name="robots" content="noindex">` for the not-found boundary, so here we
// only need to clear the root layout's inherited `index: true` — setting it to
// `null` removes that inherited value and leaves Next's single noindex directive.
export const metadata: Metadata = {
  robots: null,
}

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-section)] px-6 text-center">
      <div className="relative z-10 max-w-2xl">
        {/* Decorative elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-24 top-0 h-[280px] w-[280px] rounded-full bg-[var(--accent)]/8 blur-[90px]" />
          <div className="absolute -right-24 bottom-0 h-[260px] w-[260px] rounded-full bg-[var(--accent-lime)]/6 blur-[90px]" />
        </div>

        {/* 404 Badge */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent)] sm:text-[11px]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          Error 404
        </div>

        {/* Main heading */}
        <h1 className="text-5xl font-black leading-[0.96] tracking-[-0.06em] text-[var(--text-primary)] md:text-7xl">
          Page not found
        </h1>

        {/* Description */}
        <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
          The page you are looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        {/* Action buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] hover:bg-[var(--accent-lime)]"
          >
            <SvgIcon name="arrow-diagonal" size={16} color="var(--btn-primary-text)" />
            Back to Home
          </Link>

          <Link
            href="/contact"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-6 py-3 text-sm font-black text-[var(--text-primary)] transition hover:border-[var(--accent)]/25 hover:bg-[var(--bg-card-hover)]"
          >
            Contact Support
            <SvgIcon name="email" size={16} color="var(--accent)" />
          </Link>
        </div>

        {/* Helpful links */}
        <div className="mt-12 pt-8 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--text-muted)]">
            Try visiting{' '}
            <Link href="/portfolio" className="text-[var(--accent)] hover:underline">
              Portfolio
            </Link>
            {' · '}
            <Link href="/services" className="text-[var(--accent)] hover:underline">
              Services
            </Link>
            {' · '}
            <Link href="/blog" className="text-[var(--accent)] hover:underline">
              Blog
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}