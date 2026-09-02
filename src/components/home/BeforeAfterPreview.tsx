// src/components/home/BeforeAfterPreview.tsx
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider'

interface BeforeAfterItem {
  id: string
  title?: string
  client_name?: string
  slug?: string
  before_image?: string
  after_image?: string
  metric_value?: string
  metric_label?: string
  project_type?: string
  description?: string
}

function getTitle(item: BeforeAfterItem) {
  return item.client_name || item.title || 'Website Transformation'
}

function getMetric(item: BeforeAfterItem) {
  if (item.metric_value && item.metric_label) {
    return `${item.metric_value} ${item.metric_label}`
  }
  return item.metric_value || 'Growth'
}

export default function BeforeAfterPreview({ items = [] }: { items?: BeforeAfterItem[] }) {
  // Find first item that has BOTH before and after images
  const item = items.find((project) => project.before_image && project.after_image)

  if (!item) return null

  return (
    <section className="relative overflow-hidden bg-[var(--bg-section)] px-5 py-16 text-[var(--text)] sm:px-6 md:px-10 lg:px-12 lg:py-24">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[var(--accent)]/10 blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col items-center text-center">
          <p className="text-[length:var(--fs-eyebrow)] font-semibold uppercase tracking-[var(--ls-eyebrow)] text-[var(--accent)]">
            Before &amp; After
          </p>

          <h2 className="mt-3 max-w-3xl text-[length:var(--fs-h1)] font-semibold leading-[var(--lh-h1)] tracking-[var(--ls-h1)] text-[var(--text)]">
            Transforming outdated pages into{' '}
            <span className="text-[var(--accent)]">growth systems</span>
          </h2>

          <p className="mt-4 max-w-2xl text-[length:var(--fs-body-lg)] leading-[var(--lh-body-lg)] text-[var(--text-secondary)]">
            See how better structure, stronger visual hierarchy, trust sections,
            and conversion-focused layouts improve brand perception.
          </p>

          <Link
            href="/before-after"
            className="mt-6 inline-flex min-h-[48px] w-fit items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-6 text-[length:var(--fs-button)] font-semibold text-[var(--text)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--dur-hover)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
          >
            View Transformations
            <SvgIcon name="arrow-right" size={15} color="currentColor" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-[var(--radius-large)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)] sm:p-5">
          <div className="mb-5 flex flex-col gap-4 px-1 sm:mb-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[length:var(--fs-eyebrow)] font-semibold uppercase tracking-[var(--ls-eyebrow)] text-[var(--accent)]">
                {getMetric(item)}
              </p>

              <h3 className="mt-2 text-[length:var(--fs-h3)] font-semibold tracking-[var(--ls-h3)] text-[var(--text)]">
                {getTitle(item)}
              </h3>

              <p className="mt-2 max-w-2xl text-[length:var(--fs-body-sm)] leading-[var(--lh-body)] text-[var(--text-secondary)]">
                {item.project_type ||
                  item.description ||
                  'A focused transformation built around trust, mobile experience, and conversion clarity.'}
              </p>
            </div>

            <Link
              href={item.slug ? `/portfolio/${item.slug}` : '/portfolio'}
              className="inline-flex min-h-[48px] w-fit shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--cta)] px-6 text-[length:var(--fs-button)] font-semibold text-[var(--cta-text)] transition-colors duration-[var(--dur-hover)] hover:bg-[var(--cta-hover)]"
            >
              View Case Study
              <SvgIcon name="arrow-diagonal" size={15} color="currentColor" />
            </Link>
          </div>

          {/* Interactive Before/After Slider */}
          <BeforeAfterSlider
            beforeImage={item.before_image || ''}
            afterImage={item.after_image || ''}
            beforeLabel="BEFORE"
            afterLabel="AFTER"
          />
        </div>
      </div>
    </section>
  )
}
