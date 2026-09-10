// src/components/growth-readiness/FAQ.tsx

'use client'

import { useState } from 'react'
import SvgIcon from '@/components/ui/SvgIcon'
import { motion, AnimatePresence } from 'framer-motion'

// No completion-time answer appears here — none has been measured — and no
// answer promises a score, a turnaround time, or approval.
const faqs = [
  {
    question: 'What is the Q3/Q4 Growth Support Initiative?',
    answer: 'September is the end of Q3 and the window to prepare your business for Q4. You complete the Hbee Growth Readiness Assessment, we review your business, identify your priorities, and recommend a growth action plan. Approved merchants receive a free lifetime Growth Profile.'
  },
  {
    question: 'What is the Hbee Growth Readiness Assessment™?',
    answer: 'A structured evaluation of your business across five growth pillars: Visibility, Conversion, Retention, Authority and Scalability. Your answers are the starting point for our review — they are not scored and returned to you automatically.'
  },
  {
    question: 'What happens after I complete the assessment?',
    answer: 'Your submission goes to Hbee Digitals for review. Submitting does not mean you have been approved. We email you the outcome either way, and approved merchants receive instructions for accessing their free Growth Profile.'
  },
  {
    question: 'Is the assessment free?',
    answer: 'Yes. The assessment is free, and so is the Growth Profile for approved merchants — for life, whether or not you ever take on a paid project. Recommendations, progress tracking and quarterly personalised performance reviews are also free. Implementation is the paid part.'
  },
  {
    question: 'What does the 25% coverage actually mean?',
    answer: 'Qualified merchants receive 25% coverage of Hbee Digitals\' implementation fees and pay the remaining 75%. For example, on $1,000 of eligible Hbee fees, $250 is covered and $750 is payable by you. That is an illustration of the split, not a package price and not an initial payment amount — your figures depend on the scope you agree.'
  },
  {
    question: 'What is not covered?',
    answer: 'Coverage applies only to Hbee Digitals\' implementation fees. Third-party costs are excluded — apps, themes, hosting, advertising spend, and anything else billed to you by someone other than Hbee Digitals.'
  },
  {
    question: 'What is the September deadline exactly?',
    answer: 'For a project to be eligible, its scope must be agreed and the required initial payment made during September. Delivery does not have to be finished in September — the work can continue into October.'
  },
  {
    question: 'Do I have to buy anything to keep my Growth Profile?',
    answer: 'No. Approval for the free lifetime Growth Profile does not require any purchase. You keep the profile, the recommendations, the progress tracking and the quarterly reviews whether or not you go ahead with implementation.'
  },
  {
    question: 'How is approval decided?',
    answer: 'We consider whether you are running an active ecommerce business, whether we can identify improvement needs, whether your goals are clear, whether you are ready to provide the information, assets and approvals the work needs, and whether we can realistically help you. If you want paid implementation, you also need to be able to cover your 75% share — that does not affect approval for the free profile.'
  },
  {
    question: 'What do I need to prepare?',
    answer: 'Nothing in advance. Answer honestly based on where the business is today. Having your website URL and basic business details to hand will help.'
  },
  {
    question: 'Will my data be kept private?',
    answer: 'Your data is used to review your business, prepare your Growth Profile, and assess your fit for the initiative. We do not share your information with third parties.'
  }
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="section bg-[var(--bg-page)]">
      <div className="container-custom">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            <SvgIcon name="faq" size={16} />
            FAQ
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-heading"
          >
            Frequently Asked Questions
          </motion.h2>
        </div>

        <div className="mx-auto max-w-3xl">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden transition-all hover:border-[var(--accent-orange)]/30 shadow-[var(--shadow-sm)]"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-[var(--bg-section)]"
              >
                <span className="font-semibold text-[var(--text-primary)]">{faq.question}</span>
                <span className="ml-4 flex-shrink-0">
                  <div className="rounded-full bg-[var(--accent-orange)]/10 p-1.5 transition-colors group-hover:bg-[var(--accent-orange)]/20">
                    <SvgIcon 
                      name={openIndex === index ? 'minus' : 'plus'} 
                      size={18} 
                      color="var(--accent-orange)" 
                    />
                  </div>
                </span>
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-[var(--border)] p-6">
                      <p className="text-[var(--text-secondary)]">{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}