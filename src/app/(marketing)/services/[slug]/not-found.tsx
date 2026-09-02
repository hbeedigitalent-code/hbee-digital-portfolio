import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

export default function ServiceNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-page)] px-6 text-center">
      <div className="max-w-2xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/10">
          <SvgIcon name="services" size={40} color="var(--accent)" />
        </div>
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
          Service Not Found
        </p>
        <h1 className="text-4xl font-black tracking-[-0.05em] text-[var(--text-primary)] sm:text-5xl">
          This service doesn't exist
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-[var(--text-secondary)]">
          The service you're looking for may have been moved, renamed, or is no longer available.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/services"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] hover:bg-[var(--accent-lime)]"
          >
            View All Services
            <SvgIcon name="arrow-diagonal" size={16} color="var(--btn-primary-text)" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-8 py-3 text-sm font-black text-[var(--text-primary)] transition hover:border-[var(--accent)]/25"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </main>
  )
}