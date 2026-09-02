'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface Project {
  id: string
  title: string
  description: string
  image_url: string
  status: string
  category: string
  project_url: string
}

function CurvedUnderlineText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 text-[var(--accent)]">{children}</span>
      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[var(--accent)]/70"
        viewBox="0 0 220 18"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M4 13C50 2 142 2 216 11"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export default function ProjectsPage() {
  const reducedMotion = useReducedMotion()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'published')
        .order('display_order')

      setProjects(data || [])
      setLoading(false)
    }

    fetchProjects()
  }, [])

  if (loading) {
    return (
      <>
        <main className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] text-[var(--text-primary)]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
            <p className="text-sm font-bold text-[var(--text-muted)]">Loading projects...</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>

      <main className="relative min-h-screen overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)]">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent)]/8 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[var(--accent)]/5 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.025)_1px,transparent_1px)] bg-[size:80px_80px] opacity-25" />
        </div>

        <section className="relative px-5 pb-14 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
                <SvgIcon name="portfolio" size={14} color="var(--accent)" />
                Project Library
              </div>

              <h1 className="text-5xl font-black leading-[0.93] tracking-[-0.04em] text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
                Selected digital projects built to{' '}
                <CurvedUnderlineText>perform.</CurvedUnderlineText>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                Explore websites, ecommerce systems, brand experiences, and digital solutions
                created to improve trust, usability, and growth.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="relative px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            {projects.length === 0 ? (
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] px-6 py-16 text-center backdrop-blur-xl">
                <SvgIcon name="portfolio" size={48} color="var(--accent)" className="mx-auto mb-4" />
                <h2 className="text-xl font-black text-[var(--text-primary)]">No projects yet</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">Check back soon for new project updates.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {projects.map((project, index) => {
                  const href = project.project_url || '/portfolio'

                  return (
                    <motion.article
                      key={project.id}
                      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.42, delay: index * 0.045 }}
                      viewport={{ once: true }}
                      className="group overflow-hidden rounded-[1.8rem] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-lg)] backdrop-blur-xl transition duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:border-[var(--accent)]/30 hover:bg-[var(--bg-card-hover)]"
                    >
                      <a
                        href={href}
                        target={project.project_url ? '_blank' : undefined}
                        rel={project.project_url ? 'noopener noreferrer' : undefined}
                        className="block"
                      >
                        <div className="relative h-60 overflow-hidden bg-[var(--bg-section)]">
                          {project.image_url ? (
                            <Image
                              src={project.image_url}
                              alt={project.title}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                              className="object-cover transition duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <SvgIcon name="portfolio" size={58} color="var(--accent)" />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-page)] via-[var(--bg-page)]/25 to-transparent" />

                          {project.category && (
                            <div className="absolute left-4 top-4 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)] backdrop-blur-xl">
                              {project.category}
                            </div>
                          )}
                        </div>

                        <div className="relative p-6">
                          <h2 className="text-2xl font-black leading-tight tracking-[-0.035em] text-[var(--text-primary)]">
                            {project.title}
                          </h2>

                          <p className="mt-4 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">
                            {project.description}
                          </p>

                          <div className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[var(--accent)] transition group-hover:text-[var(--accent-lime)]">
                            View Project
                            <SvgIcon
                              name="arrow-diagonal"
                              size={15}
                              color="var(--accent)"
                              className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                            />
                          </div>
                        </div>
                      </a>
                    </motion.article>
                  )
                })}
              </div>
            )}

            <div className="mt-16 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center shadow-[var(--shadow-lg)] backdrop-blur-2xl sm:p-8">
              <h2 className="text-3xl font-black tracking-[-0.04em] text-[var(--text-primary)] md:text-4xl">
                Want your project here <CurvedUnderlineText>next?</CurvedUnderlineText>
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                Let's create a premium digital system for your website, store, or brand.
              </p>

              <Link
                href="/contact"
                className="mt-7 inline-flex min-h-[52px] items-center justify-center rounded-full bg-[var(--accent)] px-7 py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] hover:bg-[var(--accent-lime)]"
              >
                Start Your Project
              </Link>
            </div>
          </div>
        </section>
      </main>

    </>
  )
}