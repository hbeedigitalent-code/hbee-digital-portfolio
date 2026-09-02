import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import TrustSection from '@/components/sections/TrustSection'
import SvgIcon from '@/components/ui/SvgIcon'

export const metadata = {
  title: 'Reviews & Trust | Hbee Digitals',
  description:
    'See client feedback, trust signals, and results from Hbee Digitals projects.',
}

export const revalidate = 60

export default async function ReviewsPage() {
  const { data: trust } = await supabase
    .from('trust_section')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  return (
    <>

      <main className="bg-[var(--bg-page)] pt-28 text-[var(--text-primary)]">
        {/* Hero Section */}
        <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl text-center">
            <p className="mx-auto mb-5 inline-flex rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--accent)]">
              Reviews & Trust
            </p>

            <h1 className="mx-auto max-w-5xl text-5xl font-black uppercase leading-[0.95] tracking-[-0.06em] text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
              Proof, feedback, and trust signals from our digital work.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[var(--text-secondary)]">
              Hbee Digitals is built around reliable communication, premium
              execution, and conversion-focused improvements for ambitious brands.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[var(--accent)] px-7 py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] hover:bg-[var(--accent-lime)]"
              >
                Start Your Growth Review
              </Link>

              <Link
                href="/portfolio"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-7 py-3 text-sm font-black text-[var(--accent)] transition hover:bg-[var(--accent)]/15"
              >
                View Case Studies
                <SvgIcon name="arrow-diagonal" size={15} color="var(--accent)" />
              </Link>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        {trust && (
          <TrustSection
            data={{
              badge: trust.badge,
              headline: trust.headline,
              highlighted_word: trust.highlighted_word,
              description: trust.description,
              stats: trust.stats || [],
              partner_logos: trust.partner_logos || [],
              testimonials: trust.testimonials || [],
              trust_badges: trust.trust_badges || [],
              cta_text: trust.cta_text,
              cta_link: trust.cta_link,
            }}
          />
        )}
      </main>

    </>
  )
}