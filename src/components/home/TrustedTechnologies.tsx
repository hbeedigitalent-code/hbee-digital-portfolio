'use client'

import { motion, useReducedMotion } from 'framer-motion'

const technologies = [
  { name: 'Shopify', logo: '/svgs/shopify.svg', forceWhite: false },
  { name: 'Google', logo: '/svgs/google.svg.png', forceWhite: false },
  { name: 'Meta', logo: '/svgs/meta.svg', forceWhite: false },
  { name: 'Wordpress', logo: '/svgs/wordpress.svg', forceWhite: false },
  { name: 'Klaviyo', logo: '/svgs/klaviyo.svg', forceWhite: true },
  { name: 'GitHub', logo: '/svgs/github.svg.png', forceWhite: false },
  { name: 'Wix', logo: '/svgs/Wix.svg.png', forceWhite: true },
  { name: 'WooCommerce', logo: '/svgs/Woo_Commerce.svg', forceWhite: false },
  { name: 'Shopify Partners', logo: '/svgs/shopifypartners.svg', forceWhite: false },
  { name: 'Next.js', logo: '/svgs/nextjs.svg', forceWhite: true },
  { name: 'Supabase', logo: '/svgs/supabase.svg', forceWhite: false },
  { name: 'Vercel', logo: '/svgs/vercel.svg', forceWhite: true },
  { name: 'Stripe', logo: '/svgs/stripe.svg', forceWhite: false },
]

export default function TrustedTechnologies() {
  const reducedMotion = useReducedMotion()
  const loopItems = [...technologies, ...technologies]

  return (
    <section className="relative overflow-hidden bg-[var(--bg-inverse)] py-10 text-[var(--text-on-inverse)] sm:py-12">
      <p className="mb-7 px-5 text-center text-[length:var(--fs-caption)] font-semibold uppercase tracking-[var(--ls-eyebrow)] text-white/55">
        Partners &amp; technologies we use
      </p>

      <div
        className="relative overflow-hidden"
        style={{
          WebkitMaskImage:
            'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)',
          maskImage:
            'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)',
        }}
      >
        <motion.div
          animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
          transition={
            reducedMotion ? undefined : { duration: 24, repeat: Infinity, ease: 'linear' }
          }
          className="flex w-max items-center gap-10 px-5 sm:gap-14"
        >
          {loopItems.map((tech, index) => (
            <img
              key={`${tech.name}-${index}`}
              src={tech.logo}
              alt={tech.name}
              loading="lazy"
              className={`h-6 w-auto shrink-0 object-contain opacity-70 transition-opacity duration-300 hover:opacity-100 sm:h-7 ${
                tech.forceWhite ? 'brightness-0 invert' : ''
              }`}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
