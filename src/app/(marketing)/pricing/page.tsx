import Link from 'next/link'
import { supabase } from '@/lib/supabase'

import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

export const revalidate = 60

interface PricingPackage {
  id: string
  name: string
  subtitle?: string
  price?: string
  description?: string
  features?: string[] | string
  best_for?: string
  cta_text?: string
  cta_link?: string
  is_featured?: boolean
  display_order?: number
}

function normalizeArray(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  return []
}

export const metadata = {
  title: 'Pricing & Investment | Hbee Digitals',
  description:
    'Explore Hbee Digitals investment packages for website design, Shopify optimization, brand systems, ecommerce growth, and digital strategy.',
}

export default async function PricingPage() {
  const { data } = await supabase
    .from('pricing_packages')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  const packages: PricingPackage[] = data || []

  return (
    <>

      <main className="relative overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)]">
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent)]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[var(--accent-lime)]/5 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
        </div>

        {/* Hero Section */}
        <section className="px-5 pb-14 pt-32 sm:px-6 md:px-10 lg:px-12 lg:pb-20 lg:pt-36">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-5xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                <SvgIcon name="pricing" size={14} color="var(--accent)" />
                Pricing / Investment
              </p>

              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.06em] text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
                Clear investment options for serious{' '}
                <GradientHeading>digital growth.</GradientHeading>
              </h1>

              <p className="mt-7 max-w-3xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                Choose the level of support your brand needs — from focused website improvements
                to complete ecommerce growth systems and long-term digital infrastructure.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            {packages.length > 0 ? (
              <div className="grid gap-5 lg:grid-cols-3">
                {packages.map((item) => {
                  const features = normalizeArray(item.features)

                  return (
                    <div
                      key={item.id}
                      className={`relative overflow-hidden rounded-[2rem] border p-6 transition hover:-translate-y-1 ${
                        item.is_featured
                          ? 'border-[var(--accent)]/30 bg-[var(--accent)]/10 shadow-[0_32px_100px_rgba(57,217,122,0.12)]'
                          : 'border-[var(--border)] bg-[var(--bg-card)]'
                      }`}
                    >
                      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[var(--accent)]/10 blur-[70px]" />

                      {item.is_featured && (
                        <div className="relative mb-5 inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--btn-primary-text)]">
                          Most Popular
                        </div>
                      )}

                      <div className="relative">
                        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                          {item.subtitle || 'Growth Package'}
                        </p>

                        <h2 className="text-3xl font-black tracking-[-0.045em] text-[var(--text-primary)]">
                          {item.name}
                        </h2>

                        <p className="mt-5 text-5xl font-black tracking-[-0.06em] text-[var(--text-primary)]">
                          {item.price || 'Custom'}
                        </p>

                        <p className="mt-5 text-sm leading-7 text-[var(--text-secondary)]">
                          {item.description}
                        </p>

                        {item.best_for && (
                          <div className="mt-6 rounded-[1.3rem] border border-[var(--border)] bg-[var(--bg-section)] p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                              Best For
                            </p>
                            <p className="mt-2 text-sm font-bold text-[var(--text-secondary)]">
                              {item.best_for}
                            </p>
                          </div>
                        )}

                        <div className="mt-7 space-y-3">
                          {features.map((feature) => (
                            <div
                              key={feature}
                              className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-section)]/75 px-4 py-3"
                            >
                              <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/16 bg-[var(--accent)]/10">
                                <SvgIcon name="verified" size={12} color="var(--accent)" />
                              </span>
                              <span className="text-sm leading-6 text-[var(--text-secondary)]">
                                {feature}
                              </span>
                            </div>
                          ))}
                        </div>

                        <Link
                          href={item.cta_link || '/contact'}
                          className={`mt-8 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-black transition hover:scale-[1.02] ${
                            item.is_featured
                              ? 'bg-[var(--accent)] text-[var(--btn-primary-text)] hover:bg-[var(--accent-lime)]'
                              : 'border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/15'
                          }`}
                        >
                          {item.cta_text || 'Start A Project'}
                          <SvgIcon
                            name="arrow-diagonal"
                            size={15}
                            color={item.is_featured ? 'var(--btn-primary-text)' : 'var(--accent)'}
                          />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] px-6 py-16 text-center">
                <SvgIcon name="pricing" size={52} color="var(--accent)" />
                <h2 className="mt-5 text-2xl font-black text-[var(--text-primary)]">
                  Pricing packages coming soon
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
                  Add pricing packages from the admin dashboard to display investment options here.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="px-5 pb-24 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl grid gap-6 lg:grid-cols-3">
            {[
              {
                title: 'Transparent Scope',
                text: 'Each package starts with a clear understanding of your current needs, goals, and business direction.',
                icon: 'strategy',
              },
              {
                title: 'Built For Growth',
                text: 'We focus on digital systems that improve trust, user experience, conversion flow, and long-term scalability.',
                icon: 'growth',
              },
              {
                title: 'Custom Direction',
                text: 'If your project does not fit a package, we can recommend a custom plan based on your actual requirements.',
                icon: 'consulting',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.7rem] border border-[var(--border)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent)]/18 bg-[var(--accent)]/10">
                  <SvgIcon name={item.icon} size={20} color="var(--accent)" />
                </div>
                <h3 className="text-xl font-black text-[var(--text-primary)]">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

    </>
  )
}