'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import SvgIcon from '@/components/ui/SvgIcon'

interface Service {
  id: string
  title: string
  description: string
  short_description?: string
  full_description?: string
  icon: string
  slug: string
  is_active: boolean
  display_order: number
}

interface ServicesSectionProps {
  services?: Service[]
  title?: string
  subtitle?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const fallbackServices: Service[] = [
  { id: '1', title: 'Web Development', description: 'Modern, responsive websites built with cutting-edge technology.', short_description: 'Modern, responsive websites built with cutting-edge technology.', icon: 'web-development', slug: 'web-development', is_active: true, display_order: 1 },
  { id: '2', title: 'UI/UX Design', description: 'Beautiful, intuitive interfaces that users love.', short_description: 'Beautiful, intuitive interfaces that users love.', icon: 'ui-ux', slug: 'ui-ux-design', is_active: true, display_order: 2 },
  { id: '3', title: 'E-Commerce Solutions', description: 'Complete online store solutions with seamless user experiences.', short_description: 'Complete online store solutions.', icon: 'ecommerce', slug: 'ecommerce', is_active: true, display_order: 3 },
  { id: '4', title: 'Digital Marketing', description: 'Data-driven marketing strategies that deliver results.', short_description: 'Data-driven marketing strategies.', icon: 'digital-marketing', slug: 'digital-marketing', is_active: true, display_order: 4 },
  { id: '5', title: 'Brand Strategy', description: 'Comprehensive branding solutions for strong market presence.', short_description: 'Comprehensive branding solutions.', icon: 'branding', slug: 'brand-strategy', is_active: true, display_order: 5 },
  { id: '6', title: 'SEO Optimization', description: 'Improve search rankings and drive organic traffic.', short_description: 'Improve search rankings and drive organic traffic.', icon: 'seo', slug: 'seo', is_active: true, display_order: 6 },
  { id: '7', title: 'PPC Management', description: 'Data-driven ad campaigns for maximum ROI.', short_description: 'Data-driven ad campaigns for maximum ROI.', icon: 'ppc', slug: 'ppc', is_active: true, display_order: 7 },
  { id: '8', title: 'Technical Consulting', description: 'Expert guidance on technology stack and architecture.', short_description: 'Expert guidance on technology stack.', icon: 'consulting', slug: 'technical-consulting', is_active: true, display_order: 8 },
  { id: '9', title: 'Maintenance & Support', description: 'Ongoing maintenance, security updates, and performance optimization.', short_description: 'Ongoing maintenance and support.', icon: 'support', slug: 'maintenance', is_active: true, display_order: 9 },
]

function cleanIconName(icon?: string): string {
  if (!icon) return 'services'
  const cleaned = icon.toLowerCase().trim()
  if (cleaned.includes('web')) return 'web-development'
  if (cleaned.includes('ecom')) return 'ecommerce'
  if (cleaned.includes('ui') || cleaned.includes('ux')) return 'ui-ux'
  if (cleaned.includes('market')) return 'digital-marketing'
  if (cleaned.includes('brand')) return 'branding'
  if (cleaned.includes('consult')) return 'consulting'
  if (cleaned.includes('seo')) return 'seo'
  if (cleaned.includes('ppc')) return 'google-analytics'
  if (cleaned.includes('social')) return 'instagram'
  if (cleaned.includes('maintenance')) return 'support'
  if (cleaned.includes('migration')) return 'migration'
  if (cleaned.includes('design')) return 'design'
  return cleaned
}

export default function ServicesSection({ 
  services: propServices, 
  title = "Customized Solutions for Every Stage of Your Digital Growth Journey",
  subtitle = "Unlock the full potential of your ecommerce venture with our comprehensive suite of services tailored to your business needs."
}: ServicesSectionProps) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchServices() {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })

        if (!error && data && data.length > 0) {
          setServices(data)
        } else if (propServices && propServices.length > 0) {
          setServices(propServices)
        } else {
          setServices(fallbackServices)
        }
      } catch (err) {
        console.error('Error fetching services:', err)
        setServices(fallbackServices)
      } finally {
        setLoading(false)
      }
    }

    if (propServices && propServices.length > 0) {
      setServices(propServices)
      setLoading(false)
    } else {
      fetchServices()
    }
  }, [propServices])

  if (loading) {
    return (
      <section className="relative w-full bg-[var(--bg-navy)]">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-8 py-16 md:py-20">
          <div className="text-center mb-10">
            <div className="h-6 w-32 animate-pulse rounded-full bg-[var(--accent-orange)]/20 mx-auto mb-3" />
            <div className="h-8 w-3/4 animate-pulse rounded-lg bg-[var(--accent-orange)]/20 mx-auto mb-3" />
            <div className="h-4 w-1/2 animate-pulse rounded-lg bg-[var(--accent-orange)]/20 mx-auto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-5 rounded-xl bg-[var(--bg-navy-mid)]/50 animate-pulse">
                <div className="w-12 h-12 rounded-lg bg-[var(--accent-orange)]/20 mb-4" />
                <div className="h-6 w-3/4 rounded-lg bg-[var(--accent-orange)]/20 mb-2" />
                <div className="h-16 w-full rounded-lg bg-[var(--accent-orange)]/20" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const displayServices = services.length > 0 ? services : fallbackServices

  return (
    <section className="relative w-full bg-[var(--bg-navy)]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-[var(--accent-orange)]/8 blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-[var(--accent-orange)]/8 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-8 py-16 md:py-20 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12 md:mb-14"
        >
          <p className="text-[length:var(--fs-eyebrow)] font-semibold uppercase tracking-[var(--ls-eyebrow)] text-[var(--accent-orange)]">
            Services
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl text-[length:var(--fs-h1)] font-semibold leading-[var(--lh-h1)] tracking-[var(--ls-h1)] text-white">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[length:var(--fs-body-lg)] leading-[var(--lh-body-lg)] text-[var(--text-on-dark-muted)]">
            {subtitle}
          </p>
        </motion.div>

        {/* 3 columns on desktop, 2 on tablet, 1 on mobile */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {displayServices.map((service) => {
            const href = service.slug ? `/services/${service.slug}` : `/services/${service.title.toLowerCase().replace(/ /g, '-')}`
            const iconName = cleanIconName(service.icon || service.title)
            
            return (
              <motion.div
                key={service.id}
                variants={itemVariants}
                className="group flex flex-col p-6 rounded-[var(--radius-card)] bg-[var(--bg-navy-mid)]/40 border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent-orange)]/40 hover:bg-[var(--bg-navy-mid)]"
              >
                <Link href={href} className="mb-5 w-fit">
                  <div className="w-12 h-12 rounded-[var(--radius-control)] bg-[var(--accent-orange)]/10 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:bg-[var(--accent-orange)]/20">
                    <SvgIcon name={iconName} size={24} color="var(--accent-orange)" />
                  </div>
                </Link>

                <Link href={href}>
                  <h3 className="text-lg font-bold text-white mb-2 transition-colors duration-300 group-hover:text-[var(--accent-orange)]">
                    {service.title}
                  </h3>
                </Link>

                <p className="text-[var(--text-on-dark-muted)] text-sm leading-relaxed mb-5 line-clamp-3">
                  {service.full_description || service.description || service.short_description}
                </p>

                <Link
                  href={href}
                  className="mt-auto inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--accent-orange)] transition-all duration-300 group-hover:gap-2"
                >
                  Learn More
                  <SvgIcon name="arrow-right" size={12} color="var(--accent-orange)" />
                </Link>
              </motion.div>
            )
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-center mt-10"
        >
          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--border)] text-[var(--text-on-dark-muted)] font-medium text-sm transition-all duration-300 hover:border-[var(--accent-orange)] hover:text-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/10"
          >
            View All Services
            <SvgIcon name="arrow-right" size={12} color="var(--accent-orange)" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}