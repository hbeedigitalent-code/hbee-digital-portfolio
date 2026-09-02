import { supabase } from '@/lib/supabase'

import TeamSection from '@/components/sections/TeamSection'
import CTASection from '@/components/sections/CTASection'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

export const revalidate = 60

interface AboutPageData {
  hero_badge?: string
  hero_title?: string
  hero_description?: string
  philosophy_title?: string
  philosophy_description_one?: string
  philosophy_description_two?: string
  about_image?: string
  show_stats?: boolean
  show_values?: boolean
  is_active?: boolean
}

interface AboutStat {
  id: string
  value: string
  label: string
  description: string
  display_order: number
  is_active: boolean
}

interface AboutValue {
  id: string
  title: string
  description: string
  icon: string
  display_order: number
  is_active: boolean
}

function getImageUrl(value?: string): string {
  if (!value) return ''
  if (value.startsWith('http')) return value
  if (value.includes('/storage/v1/object/public/')) return value
  const cleaned = value.trim().replace(/^\/+/, '')
  const { data } = supabase.storage.from('project-images').getPublicUrl(cleaned)
  return data.publicUrl
}

export default async function AboutPage() {
  // Fetch about page content
  const { data: aboutData } = await supabase
    .from('about_page')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  const about = aboutData || {}

  // Fetch stats
  const { data: statsData } = await supabase
    .from('about_stats')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  // Fetch values
  const { data: valuesData } = await supabase
    .from('about_values')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  const stats = statsData || []
  const values = valuesData || []
  const aboutImage = getImageUrl(about.about_image)

  const processSteps = [
    { title: 'Audit', description: 'We identify trust gaps, UX friction, technical issues, and conversion blockers.', icon: 'analytics' },
    { title: 'Strategy', description: 'We define the right structure, messaging, user journey, and growth direction.', icon: 'strategy' },
    { title: 'Build', description: 'We design and develop clean, premium digital experiences.', icon: 'web-development' },
    { title: 'Optimize', description: 'We refine performance, usability, trust signals, and conversion flow.', icon: 'growth' },
  ]

  return (
    <>
      <main className="relative overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)]">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent)]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[var(--accent-lime)]/5 blur-[130px]" />
        </div>

        {/* Hero Section */}
        <section className="px-5 pb-14 pt-32 sm:px-6 md:px-10 lg:px-12 lg:pb-20 lg:pt-36">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-5xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                <SvgIcon name="about" size={14} color="var(--accent)" />
                {about.hero_badge || 'About Hbee Digitals'}
              </p>
              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.06em] text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
                {about.hero_title || 'We build digital systems designed to increase trust, conversion, and long-term growth.'}
              </h1>
              <p className="mt-7 max-w-3xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                {about.hero_description || 'Hbee Digitals helps ambitious brands improve how they present, position, and scale online.'}
              </p>
            </div>
          </div>
        </section>

        {/* About Image & Philosophy Section */}
        <section className="px-5 py-14 sm:px-6 md:px-10 lg:px-12 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2 lg:items-center">
            {aboutImage && (
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-2">
                <img src={aboutImage} alt="About Hbee Digitals" className="w-full rounded-xl object-cover" />
              </div>
            )}
            <div>
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Our Philosophy</p>
              <h2 className="text-3xl font-black leading-[1] tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl md:text-5xl">
                {about.philosophy_title || 'Most brands do not struggle because of bad products.'}
              </h2>
              <p className="mt-6 text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                {about.philosophy_description_one || 'They struggle because their websites, branding, and customer experience fail to communicate trust clearly enough.'}
              </p>
              <p className="mt-6 text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                {about.philosophy_description_two || 'At Hbee Digitals, we focus on building structured digital systems that improve perception, simplify customer experience, and support sustainable growth.'}
              </p>
            </div>
          </div>
        </section>

        {/* Stats / Achievements Section */}
        {about.show_stats !== false && stats.length > 0 && (
          <section className="px-5 py-14 sm:px-6 md:px-10 lg:px-12 lg:py-20 bg-[var(--bg-section)]">
            <div className="mx-auto max-w-7xl text-center">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Our Achievements in Numbers</p>
              <h2 className="text-3xl font-black leading-[1] tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl md:text-5xl">
                Overview of our accomplishments across various domains.
              </h2>
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                {stats.map((stat) => (
                  <div key={stat.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center transition hover:-translate-y-1 hover:shadow-lg">
                    <p className="text-4xl font-black text-[var(--accent)]">{stat.value}</p>
                    <p className="mt-2 font-bold text-[var(--text-primary)]">{stat.label}</p>
                    {stat.description && <p className="mt-1 text-xs text-[var(--text-muted)]">{stat.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Values Section */}
        {about.show_values !== false && values.length > 0 && (
          <section className="px-5 py-14 sm:px-6 md:px-10 lg:px-12 lg:py-20">
            <div className="mx-auto max-w-7xl text-center">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Our Values</p>
              <h2 className="text-3xl font-black leading-[1] tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl md:text-5xl">
                Explore Our Values
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-[var(--text-secondary)]">
                From the foundation of our culture and reflect our commitment to excellence.
              </p>
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {values.map((value) => (
                  <div key={value.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10">
                      <SvgIcon name={value.icon || 'verified'} size={24} color="var(--accent)" />
                    </div>
                    <h3 className="text-xl font-black text-[var(--text-primary)]">{value.title}</h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{value.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Process Section */}
        <section className="px-5 py-14 sm:px-6 md:px-10 lg:px-12 lg:py-20 bg-[var(--bg-section)]">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 text-center">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">How We Work</p>
              <h2 className="text-3xl font-black leading-[1] tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl md:text-5xl">
                A structured process for <GradientHeading>growth.</GradientHeading>
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {processSteps.map((step, index) => (
                <div key={step.title} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--accent)]/18 bg-[var(--accent)]/10">
                    <SvgIcon name={step.icon} size={20} color="var(--accent)" />
                  </div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">0{index + 1}</p>
                  <h3 className="text-lg font-black text-[var(--text-primary)]">{step.title}</h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <TeamSection />

        {/* CTA Section */}
        <CTASection
          data={{
            title: 'Let\'s build a digital system that feels ready to scale.',
            subtitle: 'If your brand needs a stronger website, better user experience, or a more conversion-focused digital foundation, Hbee Digitals can help.',
            buttonText: 'Start A Project',
            buttonLink: '/contact',
          }}
        />
      </main>
    </>
  )
}