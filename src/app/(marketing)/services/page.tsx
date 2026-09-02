import Link from 'next/link'
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
  display_order?: number
  is_active?: boolean
  is_featured?: boolean
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

function createSlug(service: Service) {
  const base = service.slug || service.title || ''

  return base
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
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

export default async function ServicesPage() {
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  const services = data || []

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
                <SvgIcon name="services" size={14} color="var(--accent)" />
                Services
              </p>

              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.06em] text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
                Digital growth systems built for <GradientHeading>performance.</GradientHeading>
              </h1>

              <p className="mt-7 max-w-3xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                We help ambitious brands improve their websites, ecommerce systems,
                customer experience, trust signals, and conversion structure through
                premium digital execution.
              </p>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-5 md:grid-cols-2">
              {services.map((service: Service, index: number) => {
                const title = service.title || 'Service'
                const slug = createSlug(service)
                const features = normalizeArray(service.features).slice(0, 4)
                const benefits = normalizeArray(service.benefits).slice(0, 3)
                const icon = cleanIcon(service)

                return (
                  <Link
                    key={service.id || title}
                    href={slug ? `/services/${slug}` : '/services'}
                    className={`group relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/28 hover:shadow-[var(--shadow-lg)] sm:p-6 ${
                      index === 0 ? 'md:col-span-2 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:gap-8' : ''
                    }`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.12),transparent_42%)] opacity-70" />

                    <div className="relative">
                      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent)]/18 bg-[var(--accent)]/10">
                        <SvgIcon name={icon} size={25} color="var(--accent)" />
                      </div>

                      <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                        System {String(index + 1).padStart(2, '0')}
                      </p>

                      <h2 className="text-3xl font-black leading-[1] tracking-[-0.045em] text-[var(--text-primary)] sm:text-4xl">
                        {title}
                      </h2>

                      <p className="mt-5 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                        {service.short_description ||
                          service.description ||
                          'A focused digital growth system designed to improve trust, clarity, and conversion.'}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-2">
                        {service.timeline && (
                          <span className="rounded-full border border-[var(--accent)]/16 bg-[var(--accent)]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--accent)]">
                            {service.timeline}
                          </span>
                        )}

                        {service.starting_price && (
                          <span className="rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            {service.starting_price}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="relative mt-7 grid gap-3 lg:mt-0">
                      {(features.length ? features : benefits.length ? benefits : ['Strategy', 'Execution', 'Optimization']).map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-section)]/85 px-4 py-3"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--accent)]/16 bg-[var(--accent)]/10">
                            <SvgIcon name="verified" size={13} color="var(--accent)" />
                          </span>
                          <span className="text-sm font-bold text-[var(--text-secondary)]">
                            {item}
                          </span>
                        </div>
                      ))}

                      <div className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[var(--accent)]">
                        Explore Service
                        <SvgIcon name="arrow-diagonal" size={15} color="var(--accent)" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Empty State */}
            {services.length === 0 && (
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] px-6 py-16 text-center">
                <SvgIcon name="services" size={52} color="var(--accent)" />
                <h2 className="mt-5 text-2xl font-black text-[var(--text-primary)]">
                  No services available yet
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
                  Add services from the admin dashboard to display them here.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-5 pb-24 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center sm:p-10 lg:p-14">
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
              Need a custom growth system?
            </p>
            <h2 className="mx-auto max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl">
              Let's build the right digital foundation for your brand.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              Every project starts with understanding your goals, current friction,
              customer journey, and the system needed to move your brand forward.
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] hover:bg-[var(--accent-lime)]"
            >
              Start A Project
              <SvgIcon name="arrow-diagonal" size={16} color="var(--btn-primary-text)" />
            </Link>
          </div>
        </section>
      </main>

    </>
  )
}