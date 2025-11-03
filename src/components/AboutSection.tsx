// src/components/AboutSection.tsx
'use client';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

export default function AboutSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const stats = [
    { number: '50+', label: 'Projects Completed' },
    { number: '25+', label: 'Happy Clients' },
    { number: '3+', label: 'Years Experience' },
    { number: '15+', label: 'Team Members' },
  ];

  const values = [
    {
      icon: '/svgs/innovation.svg',
      title: 'Innovation',
      description: 'We stay ahead of trends and leverage cutting-edge technologies to deliver future-proof solutions.'
    },
    {
      icon: '/svgs/precision.svg',
      title: 'Precision',
      description: 'Every detail matters in creating exceptional digital experiences that exceed expectations.'
    },
    {
      icon: '/svgs/performance.svg',
      title: 'Performance',
      description: 'We build fast, scalable solutions optimized for speed, reliability, and business growth.'
    },
    {
      icon: '/svgs/partnership.svg',
      title: 'Partnership',
      description: 'We work collaboratively with clients as strategic partners to achieve their digital goals.'
    }
  ];

  return (
    <section id="about" className="py-20 bg-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-0 right-1/4 w-96 h-96 bg-[#007BFF] rounded-full filter blur-3xl opacity-5"
          animate={{
            y: [0, -20, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#00FFFF] rounded-full filter blur-3xl opacity-3"
          animate={{
            y: [0, 20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          ref={ref}
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <motion.p 
            className="text-[#007BFF] font-semibold mb-4 tracking-widest uppercase text-sm"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.2 }}
          >
            About Our Company
          </motion.p>
          
          <motion.h2 
            className="text-4xl md:text-5xl font-bold mb-6 text-gray-900"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            Crafting Digital <span className="text-gradient">Excellence</span>
          </motion.h2>
          
          <motion.div 
            className="w-24 h-1 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] mx-auto mb-8"
            initial={{ width: 0 }}
            animate={isInView ? { width: 96 } : { width: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          />
          
          <motion.p 
            className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: 0.6, duration: 0.7 }}
          >
            Hbee Digital Enterprise is a forward-thinking digital agency dedicated to transforming 
            businesses through innovative web solutions, cutting-edge design, and strategic digital 
            marketing that drives measurable results.
          </motion.p>
        </motion.div>

        {/* Stats Section */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          {stats.map((stat, index) => (
            <motion.div 
              key={stat.label} 
              className="text-center group"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
              transition={{ 
                delay: 0.9 + index * 0.1, 
                duration: 0.6,
                type: "spring",
                stiffness: 100
              }}
              whileHover={{ 
                y: -5,
                transition: { duration: 0.3 }
              }}
            >
              <motion.div
                className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#007BFF] to-[#00BFFF] bg-clip-text text-transparent mb-3"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.3 }}
              >
                {stat.number}
              </motion.div>
              <div className="text-gray-600 font-medium text-sm md:text-base">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Our Values Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 1.3 }}
          >
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Our Core Values</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do and define who we are as a company
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <ValueCard 
                key={value.title} 
                value={value} 
                index={index} 
                isInView={isInView}
              />
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ delay: 1.8, duration: 0.8 }}
        >
          <motion.button
            className="group relative bg-gradient-to-r from-[#007BFF] to-[#00BFFF] text-white px-8 py-4 rounded-full font-semibold hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-500 overflow-hidden"
            whileHover={{ 
              scale: 1.05,
              y: -2
            }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <span className="relative z-10 flex items-center justify-center">
              Learn More About Us
              <svg 
                className="w-5 h-5 ml-3 transform group-hover:translate-x-1 transition-transform duration-300" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

// ValueCard Component
function ValueCard({ value, index, isInView }: { 
  value: any; 
  index: number; 
  isInView: boolean;
}) {
  return (
    <motion.div
      className="group text-center p-8 bg-white rounded-2xl border border-gray-200 hover:border-[#007BFF] transition-all duration-500 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10"
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.9 }}
      transition={{ 
        delay: 1.4 + index * 0.15,
        duration: 0.7,
        type: "spring",
        stiffness: 80
      }}
      whileHover={{ 
        y: -8,
        transition: { duration: 0.3 }
      }}
    >
      {/* Icon Container */}
      <motion.div 
        className="relative mb-6"
        whileHover={{ 
          scale: 1.1,
          transition: { duration: 0.3 }
        }}
      >
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-r from-[#007BFF] to-[#00BFFF] flex items-center justify-center shadow-lg">
          <motion.img 
            src={value.icon} 
            alt={value.title}
            className="w-10 h-10 filter brightness-0 invert"
            whileHover={{ rotate: 5 }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>

      {/* Content */}
      <motion.h3 
        className="text-xl font-bold text-gray-900 mb-4 group-hover:text-[#007BFF] transition-colors duration-300"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1.6 + index * 0.15 }}
      >
        {value.title}
      </motion.h3>
      
      <motion.p 
        className="text-gray-600 leading-relaxed text-sm"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1.7 + index * 0.15 }}
      >
        {value.description}
      </motion.p>
    </motion.div>
  );
}