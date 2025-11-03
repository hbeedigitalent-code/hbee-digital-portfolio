"use client";

import { motion } from "framer-motion";

export default function CTASection() {
  return (
    <section className="relative py-20 bg-gradient-to-br from-blue-900 to-cyan-800 text-white overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500 rounded-full filter blur-3xl opacity-10" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500 rounded-full filter blur-3xl opacity-10" />
      </div>

      <div className="container mx-auto px-6 text-center relative z-10">
        <motion.h2 
          className="text-4xl md:text-6xl font-bold mb-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Let's Build Something<br />
          <span className="text-cyan-400">Exceptional Together</span>
        </motion.h2>

        <motion.p 
          className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          Whether it's a sleek website, a complete brand overhaul, or a digital campaign — 
          <span className="font-semibold text-white"> Hbee Digital Enterprise</span> is your partner 
          for creative, high-performance solutions.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <motion.a
            href="#contact"
            className="inline-block px-12 py-4 bg-cyan-500 text-white font-bold text-lg rounded-full hover:bg-cyan-400 transition-all duration-300 shadow-lg hover:shadow-cyan-500/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Your Project
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}