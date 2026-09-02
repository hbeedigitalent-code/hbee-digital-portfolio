// src/app/assessment/thank-you/page.tsx

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

// ============================================
// CONFETTI COMPONENT
// ============================================
const Confetti = () => {
  const [pieces, setPieces] = useState<any[]>([])

  useEffect(() => {
    const colors = ['#F97316', '#39D97A', '#3B82F6', '#FBBF24', '#8B5CF6', '#EC4899', '#06B6D4', '#F472B6', '#34D399']
    const shapes = ['square', 'circle', 'triangle']
    const newPieces = []
    
    for (let i = 0; i < 100; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 30,
        rotation: Math.random() * 360,
        size: 5 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: 2.5 + Math.random() * 3.5,
        delay: Math.random() * 2,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        wobble: Math.random() * 100
      })
    }
    setPieces(newPieces)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((piece) => {
        const isTriangle = piece.shape === 'triangle'
        const style: any = {
          width: piece.size,
          height: piece.size,
          backgroundColor: piece.color,
          left: `${piece.x}vw`,
          boxShadow: `0 0 12px ${piece.color}60`,
          clipPath: isTriangle ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
          borderRadius: piece.shape === 'circle' ? '50%' : piece.shape === 'square' ? '2px' : undefined
        }

        return (
          <motion.div
            key={piece.id}
            className="absolute"
            style={style}
            initial={{
              y: `${piece.y}vh`,
              rotate: piece.rotation,
              opacity: 1,
              scale: 0.3
            }}
            animate={{
              y: '110vh',
              rotate: piece.rotation + (Math.random() > 0.5 ? 720 : -720),
              opacity: [1, 1, 0.8, 0],
              scale: [0.3, 1.2, 1, 0.5],
              x: [`${piece.x}vw`, `${piece.x + (Math.random() - 0.5) * 15}vw`]
            }}
            transition={{
              duration: piece.duration,
              delay: piece.delay,
              ease: [0.22, 1, 0.36, 1]
            }}
          />
        )
      })}
    </div>
  )
}

// ============================================
// SPARKLE COMPONENT
// ============================================
const Sparkle = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
    transition={{
      duration: 0.8,
      delay,
      repeat: Infinity,
      repeatDelay: 2 + Math.random() * 3
    }}
    className="absolute text-xl md:text-2xl"
  >
    ✦
  </motion.div>
)

// ============================================
// MAIN PAGE
// ============================================
export default function ThankYouPage() {
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    // Hide confetti after 8 seconds to save performance
    const timer = setTimeout(() => setShowConfetti(false), 8000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {showConfetti && <Confetti />}
      
      <main className="relative min-h-screen bg-[var(--bg-page)] py-16 md:py-24 overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[var(--accent-orange)]/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[var(--accent-lime)]/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[var(--accent-orange)]/5 via-transparent to-[var(--accent-lime)]/5 blur-2xl" />
        </div>

        <div className="container-custom relative z-10">
          <div className="mx-auto max-w-2xl">
            {/* ===== MAIN CARD ===== */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 md:p-12 shadow-[var(--shadow-xl)] overflow-hidden"
            >
              {/* Card Decoration */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-orange)]/5 via-transparent to-[var(--accent-lime)]/5 pointer-events-none" />
              <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-[var(--accent-orange)]/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-[var(--accent-lime)]/10 blur-3xl pointer-events-none" />

              {/* ===== CONTENT ===== */}
              <div className="relative z-10 text-center">
                {/* Success Icon with Sparkles */}
                <div className="relative mx-auto mb-6 w-fit">
                  <Sparkle delay={0.5} />
                  <Sparkle delay={1.2} />
                  <Sparkle delay={2.0} />
                  
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 15,
                      delay: 0.2
                    }}
                    className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent-orange)] to-[var(--accent-lime)] shadow-lg shadow-[var(--accent-orange)]/25"
                  >
                    <SvgIcon name="check" size={48} color="white" />
                    {/* Pulse Ring */}
                    <motion.div
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{ scale: 1.4, opacity: 0 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeOut'
                      }}
                      className="absolute inset-0 rounded-full border-2 border-[var(--accent-orange)]"
                    />
                    <motion.div
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeOut',
                        delay: 0.5
                      }}
                      className="absolute inset-0 rounded-full border-2 border-[var(--accent-lime)]"
                    />
                  </motion.div>
                </div>

                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl md:text-5xl font-bold text-[var(--text-primary)]"
                >
                  🎉 Assessment Received!
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-3 text-lg text-[var(--text-secondary)]"
                >
                  Thank you for completing the Hbee Growth Readiness Assessment™
                </motion.p>

                {/* Divider */}
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mx-auto my-6 h-px w-24 bg-gradient-to-r from-transparent via-[var(--accent-orange)] to-transparent"
                />

                {/* ===== INFO BOX ===== */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-section)] p-6 text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      <SvgIcon name="clock" size={20} color="var(--accent-orange)" />
                    </div>
                    <div>
                      <p className="text-[var(--text-secondary)]">
                        Our team is reviewing your responses and will prepare your personalized{' '}
                        <span className="font-semibold text-[var(--text-primary)]">Growth Profile</span>.
                      </p>
                      <p className="mt-2 text-sm font-medium text-[var(--accent-orange)]">
                        ⏱️ Estimated review time: <span className="text-[var(--text-primary)]">24–48 hours</span>
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* ===== NEXT STEPS ===== */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-left"
                >
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    📌 What happens next?
                  </h3>
                  <ul className="space-y-3">
                    {[
                      'Our growth experts will review your responses',
                      'You\'ll receive a detailed Growth Profile with your HGRI™ score',
                      'We\'ll identify your growth classification and opportunities',
                      'You\'ll get actionable recommendations to accelerate growth'
                    ].map((item, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="flex items-start gap-3 text-sm text-[var(--text-secondary)]"
                      >
                        <span className="mt-0.5 flex-shrink-0 text-[var(--accent-lime)] font-bold">
                          {index + 1}
                        </span>
                        <span>{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>

                {/* ===== CTA BUTTONS ===== */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="mt-8 flex flex-wrap justify-center gap-3"
                >
                  <Link href="/growth-readiness">
                    <Button variant="secondary">
                      <SvgIcon name="chevron-left" size={16} />
                      Back to Assessment
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button>
                      <SvgIcon name="home" size={16} color="white" />
                      Go to Homepage
                    </Button>
                  </Link>
                </motion.div>

                {/* ===== TRUST BADGES ===== */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4 }}
                  className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--text-muted)]"
                >
                  <span className="flex items-center gap-1.5">
                    <SvgIcon name="verified" size={14} color="#39D97A" />
                    Secure & Private
                  </span>
                  <span className="flex items-center gap-1.5">
                    <SvgIcon name="clock" size={14} color="#F97316" />
                    Quick Review
                  </span>
                  <span className="flex items-center gap-1.5">
                    <SvgIcon name="star" size={14} color="#FBBF24" />
                    Expert Analysis
                  </span>
                </motion.div>

                {/* ===== SOCIAL PROOF ===== */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                  className="mt-6 border-t border-[var(--border)] pt-6"
                >
                  <p className="text-sm text-[var(--text-muted)]">
                    Join <span className="font-semibold text-[var(--text-primary)]">500+</span> businesses
                    that have grown with Hbee Digitals
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-[var(--accent-orange)] text-sm">★</span>
                    ))}
                    <span className="ml-2 text-sm font-medium text-[var(--text-primary)]">4.9/5</span>
                    <span className="text-sm text-[var(--text-muted)]">(150+ reviews)</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  )
}