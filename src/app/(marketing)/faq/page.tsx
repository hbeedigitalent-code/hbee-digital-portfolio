'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

interface FAQItem {
  id: string
  question: string
  answer: string
  rich_answer?: string
  category: string
  display_order: number
  is_active: boolean
}

// Category definitions
const categories = [
  { id: 'general', label: 'General' },
  { id: 'development', label: 'Development' },
  { id: 'process', label: 'Process' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'shopify', label: 'Shopify / Ecommerce' },
  { id: 'maintenance', label: 'Maintenance & Support' },
  { id: 'growth', label: 'Results & Growth' },
]

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const categoryVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

// Accordion Item Component with Chevron Arrow
function AccordionItem({ 
  item, 
  isOpen, 
  onToggle, 
  index 
}: { 
  item: FAQItem; 
  isOpen: boolean; 
  onToggle: () => void; 
  index: number 
}) {
  return (
    <motion.div
      variants={itemVariants}
      custom={index}
      className={`group rounded-xl border transition-all duration-300 ${
        isOpen
          ? 'border-[var(--accent)]/40 bg-[var(--bg-card)] shadow-[0_0_30px_rgba(57,217,122,0.08)]'
          : 'border-[var(--border)] bg-[var(--bg-card)]/50 hover:border-[var(--accent)]/20 hover:bg-[var(--bg-card)]'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 md:px-6 md:py-5"
        aria-expanded={isOpen}
      >
        <div className="flex items-start justify-between gap-4">
          <span className={`text-base md:text-lg font-semibold transition-colors ${
            isOpen ? 'text-[var(--accent)]' : 'text-[var(--text-primary)] group-hover:text-[var(--accent)]'
          }`}>
            {item.question}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="flex-shrink-0 mt-1"
          >
            <SvgIcon name="chevron-down" size={20} color={isOpen ? 'var(--accent)' : 'var(--text-muted)'} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 md:px-6 md:pb-6">
              <div className="pt-4 border-t border-[var(--border)]">
                {item.rich_answer ? (
                  <div
                    className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: item.rich_answer }}
                  />
                ) : (
                  <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                    {item.answer}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('general')
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchFAQs()
  }, [])

  async function fetchFAQs() {
    try {
      const { data } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (data && data.length > 0) {
        setFaqs(data as FAQItem[])
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter FAQs by category
  const filteredFaqs = useMemo(() => {
    if (activeCategory === 'general') {
      return faqs
    }
    return faqs.filter((faq) => faq.category?.toLowerCase() === activeCategory)
  }, [faqs, activeCategory])

  // Split into two columns
  const midPoint = Math.ceil(filteredFaqs.length / 2)
  const leftColumnFaqs = filteredFaqs.slice(0, midPoint)
  const rightColumnFaqs = filteredFaqs.slice(midPoint)

  const handleToggle = useCallback((id: string) => {
    setOpenStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }, [])

  if (loading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      </>
    )
  }

  return (
    <>

      <main className="min-h-screen bg-[var(--bg-page)] pt-24">
        {/* Hero Intro Area */}
        <section className="relative overflow-hidden px-5 pt-16 pb-12 sm:px-6 md:px-8 lg:pt-24 lg:pb-16">
          {/* Gradient background glow using CSS variables */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-r from-[var(--accent)]/15 via-[var(--accent-orange)]/8 to-transparent blur-[120px]" />
            <div className="absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-[var(--accent)]/10 blur-[100px]" />
            <div className="absolute -right-40 top-1/3 h-80 w-80 rounded-full bg-[var(--accent-orange)]/8 blur-[100px]" />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-4 py-1.5 mb-6">
                <SvgIcon name="faq" size={14} color="var(--accent)" />
                <span className="text-xs font-semibold text-[var(--accent)]">Knowledge Base</span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--text-primary)] mb-6 leading-[1.1] tracking-[-0.02em]">
                Frequently Asked <br />
                <span className="text-gradient">Questions</span>
              </h1>
              <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
                Find answers about our development process, pricing, Shopify expertise,
                support, and how we help ecommerce brands grow.
              </p>
            </motion.div>
          </div>
        </section>

        {/* FAQ Categories - Sticky Tabs with Blue (default) and Orange (active) */}
        <section className="sticky top-20 z-20 bg-[var(--bg-page)]/90 backdrop-blur-md border-b border-[var(--border)]">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-8">
            <motion.div
              variants={categoryVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap justify-center gap-2 py-4"
            >
              <button
                onClick={() => setActiveCategory('general')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeCategory === 'general'
                    ? 'bg-[var(--accent-orange)] text-white shadow-lg'
                    : 'bg-[var(--blue-500)] text-white hover:bg-[var(--blue-600)]'
                }`}
              >
                All Questions
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeCategory === cat.id
                      ? 'bg-[var(--accent-orange)] text-white shadow-lg'
                      : 'bg-[var(--blue-500)] text-white hover:bg-[var(--blue-600)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </motion.div>
          </div>
        </section>

        {/* FAQ Accordion Grid */}
        <section className="px-5 py-16 sm:px-6 md:px-8 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: 20 }}
                className="grid gap-5 md:grid-cols-2 md:gap-6"
              >
                {/* Left Column */}
                <div className="space-y-4 md:space-y-5">
                  {leftColumnFaqs.map((faq, idx) => (
                    <AccordionItem
                      key={faq.id}
                      item={faq}
                      isOpen={openStates[faq.id] || false}
                      onToggle={() => handleToggle(faq.id)}
                      index={idx}
                    />
                  ))}
                </div>

                {/* Right Column */}
                <div className="space-y-4 md:space-y-5">
                  {rightColumnFaqs.map((faq, idx) => (
                    <AccordionItem
                      key={faq.id}
                      item={faq}
                      isOpen={openStates[faq.id] || false}
                      onToggle={() => handleToggle(faq.id)}
                      index={idx}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {filteredFaqs.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--accent)]/10 mb-4">
                  <SvgIcon name="faq" size={28} color="var(--accent)" />
                </div>
                <p className="text-[var(--text-muted)] text-lg">No questions found in this category.</p>
              </motion.div>
            )}
          </div>
        </section>

        {/* CTA Area After FAQ */}
        <section className="px-5 py-16 sm:px-6 md:px-8 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--accent)]/5 via-[var(--accent-orange)]/5 to-transparent p-8 text-center md:p-12 border border-[var(--border)]"
            >
              {/* Background glow effects */}
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[var(--accent)]/20 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-[var(--accent-orange)]/20 blur-3xl" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/15 px-4 py-1.5 mb-6">
                  <SvgIcon name="messages" size={14} color="var(--accent)" />
                  <span className="text-xs font-semibold text-[var(--accent)]">Still have questions?</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">
                  We're Here to Help
                </h2>
                <p className="text-lg text-[var(--text-secondary)] max-w-lg mx-auto mb-8">
                  Send us a message and we'll guide you based on your current website, goals, and next step.
                </p>
                <Button
                  href="/contact"
                  variant="cta"
                  size="lg"
                  icon={
                    <SvgIcon name="arrow-right" size={16} color="white" />
                  }
                >
                  Contact Hbee Digitals
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

    </>
  )
}