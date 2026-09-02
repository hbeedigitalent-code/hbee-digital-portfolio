import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

interface PortfolioItem {
  id: string
  slug: string
  title?: string
  client_name?: string
  category?: string
  project_type?: string
  description?: string
  image_url?: string
  metric_label?: string
  metric_value?: string
  industry?: string
  technology?: string
  website_url?: string
  brief?: string
  results_summary?: string
  before_image?: string
  after_image?: string
  gallery_images?: string[]
  result_metrics?: { label: string; value: string }[]
  is_before_after?: boolean
  featured?: boolean
  is_active?: boolean
  challenge?: string
  solution?: string
  results?: string
  technologies_used?: string[]
  testimonial?: string
  seo_title?: string
  seo_description?: string
}

async function getProject(slug: string) {
  const { data } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  return data as PortfolioItem | null
}

async function getRelatedProjects(currentId: string, category?: string) {
  let query = supabase
    .from('portfolio_items')
    .select('id, title, client_name, slug, category, image_url, featured_image')
    .eq('is_active', true)
    .neq('id', currentId)
    .limit(3)

  if (category) {
    query = query.eq('category', category)
  }

  const { data } = await query
  return data || []
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const project = await getProject(params.slug)

  if (!project) {
    return { title: 'Case Study Not Found | Hbee Digitals' }
  }

  const title = project.seo_title || `${project.client_name || project.title || 'Case Study'} | Hbee Digitals`

  return {
    title,
    description: project.seo_description || project.description || 'Conversion-focused ecommerce and digital growth case study.',
  }
}

export default async function PortfolioDetailPage({ params }: { params: { slug: string } }) {
  const project = await getProject(params.slug)

  if (!project) {
    notFound()
  }

  const title = project.client_name || project.title || 'Portfolio Project'
  const metrics = project.result_metrics || []
  const technologies = project.technologies_used || []
  const gallery = project.gallery_images?.length ? project.gallery_images : project.image_url ? [project.image_url] : []
  const relatedProjects = await getRelatedProjects(project.id, project.category)

  return (
    <>

      <main className="relative overflow-hidden bg-[var(--bg-page)] pt-28">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent)]/5 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[var(--accent-orange)]/5 blur-[130px]" />
        </div>

        {/* Hero */}
        <section className="px-5 pb-12 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1 mb-4">
                <SvgIcon name="portfolio" size={14} color="var(--accent)" />
                <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                  Case Study
                </span>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-3">
                {project.category || project.industry || 'Digital Growth'}
              </p>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.02em] text-[var(--text-primary)]">
                {title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-3">
                <span className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-white">
                  {project.metric_value || 'Growth'}
                  {project.metric_label ? ` ${project.metric_label}` : ''}
                </span>
                {project.is_before_after && (
                  <span className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)]">
                    Before / After Transformation
                  </span>
                )}
              </div>

              <p className="mt-6 text-base text-[var(--text-secondary)] leading-relaxed">
                {project.description ||
                  'Conversion-focused ecommerce growth system designed to improve user trust, brand positioning, and long-term scalability.'}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/contact" variant="cta" size="md">
                  Get Free Consultation
                </Button>
                {project.website_url && (
                  <a
                    href={project.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline-dark inline-flex items-center gap-2"
                  >
                    Visit Website
                    <SvgIcon name="arrow-diagonal" size={14} color="white" />
                  </a>
                )}
              </div>
            </div>

            {project.image_url && (
              <div className="mt-12 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-2 shadow-[var(--shadow-lg)]">
                <img src={project.image_url} alt={title} className="w-full rounded-xl object-cover" />
              </div>
            )}
          </div>
        </section>

        {/* Challenge & Solution */}
        {(project.challenge || project.solution || project.brief) && (
          <section className="px-5 py-12 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <SvgIcon name="warning" size={18} color="var(--accent)" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">The Challenge</p>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {project.challenge || project.brief ||
                      'The project focused on improving trust signals, simplifying the customer journey, enhancing the mobile experience, and positioning the brand more professionally online.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <SvgIcon name="check-circle" size={18} color="var(--accent)" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">The Solution</p>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {project.solution ||
                      'A comprehensive digital strategy was implemented, focusing on conversion-centered design, improved user experience, and performance optimization.'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Results */}
        <section className="px-5 py-12 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-2">Results & Impact</p>
                <h2 className="text-3xl font-bold text-[var(--text-primary)]">
                  Measurable <span className="text-[var(--accent)]">outcomes.</span>
                </h2>
                <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {project.results || project.results_summary ||
                      'The project successfully improved brand perception, user engagement, conversion rates, and overall digital presence.'}
                  </p>
                </div>

                {metrics.length > 0 && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {metrics.map((metric, index) => (
                      <div key={index} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
                        <p className="text-2xl font-bold text-[var(--accent)]">{metric.value}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{metric.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-3">Project Details</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">Industry</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{project.industry || 'E-Commerce'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">Project Type</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{project.project_type || 'Growth System'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">Technology</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{project.technology || 'Shopify'}</p>
                    </div>
                    {project.website_url && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">Website</p>
                        <a href={project.website_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[var(--accent)] hover:underline break-all">
                          {project.website_url.replace('https://', '').replace('http://', '')}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {technologies.length > 0 && (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-3">Technologies Used</p>
                    <div className="flex flex-wrap gap-2">
                      {technologies.map((tech) => (
                        <span key={tech} className="rounded-full bg-[var(--bg-section)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {project.testimonial && (
                  <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-5">
                    <SvgIcon name="quote" size={20} color="var(--accent)" className="mb-2" />
                    <p className="text-sm italic text-[var(--text-secondary)]">"{project.testimonial}"</p>
                    <p className="mt-2 text-xs font-bold text-[var(--accent)]">— {title}</p>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </section>

        {/* Before/After */}
        {project.is_before_after && project.before_image && project.after_image && (
          <section className="px-5 py-12 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-2">Before & After</p>
              <h2 className="text-3xl font-bold text-[var(--text-primary)]">
                From outdated to <span className="text-[var(--accent)]">premium.</span>
              </h2>
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
                  <p className="text-sm font-bold mb-2">Before</p>
                  <img src={project.before_image} alt="Before" className="w-full rounded-xl" />
                </div>
                <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold">After</p>
                    <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-white">Optimized</span>
                  </div>
                  <img src={project.after_image} alt="After" className="w-full rounded-xl" />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Gallery */}
        {gallery.length > 0 && (
          <section className="px-5 py-12 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-2">Gallery</p>
              <h2 className="text-3xl font-bold text-[var(--text-primary)]">
                Project <span className="text-[var(--accent)]">showcase.</span>
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {gallery.map((image, index) => (
                  <div key={index} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-2">
                    <img src={image} alt={`${title} showcase ${index + 1}`} className="w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Related Projects */}
        {relatedProjects.length > 0 && (
          <section className="px-5 py-12 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-2">Related Work</p>
              <h2 className="text-3xl font-bold text-[var(--text-primary)]">
                More <span className="text-[var(--accent)]">case studies.</span>
              </h2>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {relatedProjects.map((related) => (
                  <Link key={related.id} href={`/portfolio/${related.slug}`} className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]">
                    <div className="aspect-video overflow-hidden bg-[var(--bg-section)]">
                      <img
                        src={related.featured_image || related.image_url || ''}
                        alt={related.client_name || related.title || 'Project'}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-semibold text-[var(--accent)]">{related.category || 'Case Study'}</p>
                      <h3 className="mt-1 font-bold text-[var(--text-primary)]">{related.client_name || related.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="px-5 pb-24 pt-12 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--bg-navy)] p-8 text-center sm:p-12">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Ready for your transformation?
              </p>
              <h2 className="mx-auto mt-4 max-w-2xl text-2xl sm:text-3xl font-bold text-white">
                Let's create a digital experience that works harder for your business.
              </h2>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button href="/contact" variant="cta" size="md">
                  Get Free Consultation
                </Button>
                <Button href="/portfolio" variant="outline-dark" size="md">
                  View More Projects
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

    </>
  )
}