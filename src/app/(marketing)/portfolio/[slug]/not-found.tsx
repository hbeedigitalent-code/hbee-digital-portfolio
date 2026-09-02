import Link from 'next/link'
import Button from '@/components/ui/Button'
import SvgIcon from '@/components/ui/SvgIcon'

export default function PortfolioNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] px-5">
      <div className="max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1 mb-4">
          <SvgIcon name="portfolio" size={14} color="var(--accent)" />
          <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            Case Study Not Found
          </span>
        </div>

        <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-[-0.02em] text-[var(--text-primary)]">
          This portfolio project does not exist.
        </h1>

        <p className="mt-4 text-base text-[var(--text-secondary)]">
          The project may have been removed, unpublished, or the URL may be incorrect.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href="/portfolio" variant="primary" size="md">
            Back To Portfolio
          </Button>
          <Button href="/contact" variant="secondary" size="md">
            Contact Us
          </Button>
        </div>
      </div>
    </main>
  )
}