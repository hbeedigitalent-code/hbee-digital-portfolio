import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { supabase } from '@/lib/supabase'

import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

export const revalidate = 60

interface Service {
  id: string
  title?: string
  slug?: string
  description?: string
  short_description?: string
  full_description?: string
  icon?: string
  features?: string[] | string
  benefits?: string[] | string
  deliverables?: string[] | string
  timeline?: string
  starting_price?: string
  featured_image?: string
  is_active?: boolean
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

function cleanIcon(service: Service) {
  const source = service.icon || service.title || 'services'

  const cleaned = source
    .replace('/public/svgs/', '')
    .replace('public/svgs/', '')
    .replace('/svgs/', '')
    .replace('svgs/', '')
    .replace('.svg', '')
    .replace(/^\/+/, '')
    .trim()
    .toLowerCase()

  if (cleaned.includes('ecommerce') || cleaned.includes('commerce') || cleaned.includes('shopify')) return 'ecommerce'
  if (cleaned.includes('ui') || cleaned.includes('ux')) return 'ui-ux'
  if (cleaned.includes('marketing')) return 'digital-marketing'
  if (cleaned.includes('brand')) return 'branding'
  if (cleaned.includes('web') || cleaned.includes('site')) return 'web-development'
  if (cleaned.includes('consult')) return 'consulting'

  return cleaned || 'services'
}

async function getService(slug: string): Promise<Service | null> {
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  return data
}

async function getRelatedServices(currentId: string): Promise<Service[]> {
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .neq('id', currentId)
    .order('display_order', { ascending: true })
    .limit(3)

  return data || []
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const service = await getService(params.slug)

  if (!service) {
    return {
      title: 'Service Not Found | Hbee Digitals',
    }
  }

  return {
    title: `${service.title} | Hbee Digitals`,
    description: service.short_description || service.description,
    openGraph: {
      title: service.title,
      description: service.short_description || service.description,
      images: service.featured_image ? [{ url: service.featured_image }] : [],
    },
  }
}

export default async function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const service = await getService(params.slug)

  if (!service) {
    notFound()
  }

  const relatedServices = await getRelatedServices(service.id)
  const icon = cleanIcon(service)
  const features = normalizeArray(service.features)
  const benefits = normalizeArray(service.benefits)
  const deliverables = normalizeArray(service.deliverables)

  // Service Schema for SEO
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.description,
    provider: {
      '@type': 'Organization',
      name: 'Hbee Digitals',
      url: 'https://hbeedigitals.com',
    },
    serviceType: service.title,
    ...(service.starting_price && {
      offers: {
        '@type': 'Offer',
        price: service.starting_price,
        priceCurrency: 'USD',
      },
    }),
  }

  return (
    <>

      <main className="relative overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)]">
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent)]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[var(--accent-lime)]/5 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
        </div>

        {/* JSON-LD Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
        />

        {/* Hero Section */}
        <section className="relative px-5 pt-32 pb-16 sm:px-6 md:px-10 lg:px-12 lg:pt-36 lg:pb-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              {/* Left Column - Content */}
              <div>
                <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--accent)]/18 bg-[var(--accent)]/10">
                  <SvgIcon name={icon} size={32} color="var(--accent)" />
                </div>

                <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                  Premium Digital Service
                </p>

                <h1 className="text-4xl font-black leading-[1.1] tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
                  <GradientHeading>{service.title}</GradientHeading>
                </h1>

                <p className="mt-6 text-base leading-7 text-[var(--text-secondary)] md:text-lg">
                  {service.full_description || service.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {service.timeline && (
                    <div className="rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                      📅 {service.timeline}
                    </div>
                  )}
                  {service.starting_price && (
                    <div className="rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                      💰 {service.starting_price}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    href="/contact"
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-orange-green px-8 py-3 text-sm font-black text-white transition hover:scale-[1.02]"
                  >
                    Start Your Project
                    <SvgIcon name="arrow-diagonal" size={16} color="white" />
                  </Link>
                  <Link
                    href="/portfolio"
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-8 py-3 text-sm font-black text-[var(--text-primary)] transition hover:border-[var(--accent)]/25 hover:bg-[var(--bg-card-hover)]"
                  >
                    View Portfolio
                  </Link>
                </div>
              </div>

              {/* Right Column - Optional Image */}
              {service.featured_image && (
                <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[var(--accent)]/20 via-[var(--accent-lime)]/10 to-[var(--accent-orange)]/20 blur-2xl" />
                  <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-card)] p-2 shadow-xl">
                    <img
                      src={service.featured_image}
                      alt={service.title}
                      className="w-full rounded-xl object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        {features.length > 0 && (
          <section className="relative px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <div className="mb-10 text-center">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                  What's Included
                </p>
                <h2 className="text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
                  Everything you need to succeed
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-[var(--text-secondary)]">
                  Our service includes all the essential components to help your business grow online.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1 hover:border-[var(--accent)]/25 hover:shadow-lg"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                      <SvgIcon name="check" size={24} color="var(--accent)" />
                    </div>
                    <h3 className="text-lg font-black text-[var(--text-primary)]">{feature}</h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Professional solution tailored to your business needs.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Benefits Section */}
        {benefits.length > 0 && (
          <section className="relative bg-[var(--bg-section)] px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <div className="mb-10 text-center">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                  Why Choose This Service
                </p>
                <h2 className="text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
                  Benefits that make a difference
                </h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition hover:shadow-md"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10">
                      <span className="text-xl font-black text-[var(--accent)]">{index + 1}</span>
                    </div>
                    <p className="text-base font-bold leading-7 text-[var(--text-primary)]">
                      {benefit}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Deliverables Section */}
        {deliverables.length > 0 && (
          <section className="relative px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <div className="mb-10 text-center">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                  What You'll Get
                </p>
                <h2 className="text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
                  Deliverables
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {deliverables.map((deliverable, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:border-[var(--accent)]/25"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/18 bg-[var(--accent)]/10 text-sm font-black text-[var(--accent)]">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <p className="text-base font-bold leading-6 text-[var(--text-secondary)]">
                      {deliverable}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Process Section */}
        <section className="relative bg-[var(--bg-section)] px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 text-center">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                Our Process
              </p>
              <h2 className="text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
                How we work together
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {[
                { step: '01', title: 'Discovery', desc: 'We learn about your goals and challenges.', icon: 'search' },
                { step: '02', title: 'Strategy', desc: 'We create a tailored plan for your success.', icon: 'strategy' },
                { step: '03', title: 'Execution', desc: 'We build and implement your solution.', icon: 'web-development' },
                { step: '04', title: 'Launch & Support', desc: 'We launch and provide ongoing support.', icon: 'support' },
              ].map((item) => (
                <div key={item.step} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-orange-green">
                    <SvgIcon name={item.icon} size={24} color="white" />
                  </div>
                  <p className="text-xs font-black text-[var(--accent)]">{item.step}</p>
                  <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related Services */}
        {relatedServices.length > 0 && (
          <section className="relative px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <div className="mb-10 text-center">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                  Explore More
                </p>
                <h2 className="text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
                  Related Services
                </h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {relatedServices.map((related) => {
                  const relatedIcon = cleanIcon(related)
                  return (
                    <Link
                      key={related.id}
                      href={`/services/${related.slug}`}
                      className="group block rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition hover:-translate-y-1 hover:border-[var(--accent)]/25 hover:shadow-lg"
                    >
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10 transition group-hover:scale-110">
                        <SvgIcon name={relatedIcon} size={24} color="var(--accent)" />
                      </div>
                      <h3 className="text-lg font-black text-[var(--text-primary)]">{related.title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">
                        {related.short_description || related.description}
                      </p>
                      <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[var(--accent)] transition group-hover:gap-2">
                        Learn More
                        <SvgIcon name="arrow-diagonal" size={14} color="var(--accent)" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="relative px-5 pb-24 pt-10 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <div className="overflow-hidden rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-r from-[var(--accent)]/5 to-transparent p-8 text-center sm:p-12">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
                Ready to get started?
              </p>
              <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black leading-tight text-[var(--text-primary)] sm:text-4xl">
                Let's discuss your {service.title?.toLowerCase()} project
              </h2>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/contact"
                  className="inline-flex min-h-[50px] items-center justify-center rounded-full bg-gradient-orange-green px-8 py-3 text-sm font-black text-white transition hover:scale-[1.02]"
                >
                  Get Free Consultation
                  <SvgIcon name="arrow-diagonal" size={14} color="white" />
                </Link>
                <Link
                  href="/portfolio"
                  className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-8 py-3 text-sm font-black text-[var(--accent)] transition hover:bg-[var(--accent)]/15"
                >
                  View Case Studies
                </Link>
              </div>
              <p className="mt-6 text-sm text-[var(--text-muted)]">
                No obligation. Free consultation to understand your needs.
              </p>
            </div>
          </div>
        </section>
      </main>

    </>
  )
}