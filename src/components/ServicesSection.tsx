// src/components/ServicesSection.tsx
'use client';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const services = [
  {
    icon: '/svgs/web-development.svg',
    title: 'Web Development',
    description: 'Custom websites and web applications built with modern technologies.',
    features: ['React/Next.js', 'Responsive Design', 'SEO Optimization', 'Performance'],
    gradient: 'from-[#007BFF] to-[#00BFFF]'
  },
  {
    icon: '/svgs/ecommerce.svg',
    title: 'E-Commerce Solutions',
    description: 'Complete online store solutions with seamless user experiences.',
    features: ['Shopify/WordPress', 'Payment Gateways', 'Product Management', 'Analytics'],
    gradient: 'from-[#007BFF] to-[#00FFFF]'
  },
  {
    icon: '/svgs/ui-ux.svg',
    title: 'UI/UX Design',
    description: 'User-centered designs that create engaging experiences.',
    features: ['User Research', 'Wireframing', 'Prototyping', 'Testing'],
    gradient: 'from-[#00BFFF] to-[#00FFFF]'
  },
  {
    icon: '/svgs/digital-marketing.svg',
    title: 'Digital Marketing',
    description: 'Data-driven strategies to grow your online presence.',
    features: ['SEO/SEM', 'Social Media', 'Content Strategy', 'Analytics'],
    gradient: 'from-[#007BFF] to-[#00BFFF]'
  },
  {
    icon: '/svgs/branding.svg',
    title: 'Brand Strategy',
    description: 'Comprehensive branding solutions for market presence.',
    features: ['Brand Identity', 'Market Research', 'Positioning', 'Visual Design'],
    gradient: 'from-[#00BFFF] to-[#00FFFF]'
  },
  {
    icon: '/svgs/consulting.svg',
    title: 'Technical Consulting',
    description: 'Expert guidance on technology and digital transformation.',
    features: ['Tech Audit', 'Architecture', 'Best Practices', 'Scalability'],
    gradient: 'from-[#007BFF] to-[#00FFFF]'
  }
];

export default function ServicesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="services" className="py-20 bg-white relative overflow-hidden">
      {/* Background Elements - Light version for white background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#007BFF] rounded-full filter blur-3xl opacity-5 animate-float" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#00FFFF] rounded-full filter blur-3xl opacity-3 animate-float" style={{ animationDelay: '2s' }} />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,123,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,123,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
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
            Our Services
          </motion.p>
          <motion.h2 
            className="text-4xl md:text-5xl font-bold mb-6 text-gray-900"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.4 }}
          >
            What We <span className="text-gradient">Offer</span>
          </motion.h2>
          <motion.div 
            className="w-24 h-1 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] mx-auto mb-8"
            initial={{ width: 0 }}
            animate={isInView ? { width: 96 } : { width: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          />
        </motion.div>

        {/* Services Grid - Vertex Dimension Style */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.8 }}
        >
          {services.map((service, index) => (
            <ServiceCard 
              key={service.title}
              service={service}
              index={index}
              isInView={isInView}
            />
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 1.2 }}
        >
          <motion.button
            className="bg-gradient-to-r from-[#007BFF] to-[#00BFFF] text-white px-8 py-4 rounded-full font-semibold hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="flex items-center justify-center">
              View All Services
              <svg 
                className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" 
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

function ServiceCard({ service, index, isInView }: { service: any; index: number; isInView: boolean }) {
  return (
    <motion.div
      className="group relative bg-white rounded-2xl p-8 border border-gray-200 hover:border-[#007BFF] transition-all duration-500 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10"
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ 
        y: -10,
        transition: { duration: 0.3 }
      }}
    >
      {/* Hover Gradient Border Effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#007BFF] to-[#00BFFF] opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
      <div className="absolute inset-[2px] rounded-2xl bg-white -z-10" />

      {/* Icon Container with Gradient Background */}
      <div className="relative mb-6">
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-r ${service.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-lg`}>
          <img 
            src={service.icon} 
            alt={service.title}
            className="w-10 h-10 filter brightness-0 invert"
          />
        </div>
        {/* Floating particles around icon */}
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#00FFFF] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-ping" />
        <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-[#00BFFF] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200 animate-ping" />
      </div>

      {/* Content */}
      <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-[#007BFF] transition-colors">
        {service.title}
      </h3>
      
      <p className="text-gray-600 mb-6 leading-relaxed">
        {service.description}
      </p>

      {/* Features List */}
      <ul className="space-y-3 mb-8">
        {service.features.map((feature: string, i: number) => (
          <motion.li 
            key={i}
            className="flex items-center text-gray-700 group-hover:text-gray-900 transition-colors"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + (index * 0.1) + (i * 0.1) }}
          >
            <div className="w-2 h-2 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full mr-3 group-hover:scale-125 transition-transform duration-300" />
            <span className="text-sm font-medium">{feature}</span>
          </motion.li>
        ))}
      </ul>

      {/* CTA Button */}
      <motion.button
        className="w-full py-3 rounded-xl font-semibold transition-all duration-300 group-hover:shadow-lg border-2 border-gray-200 group-hover:border-transparent group-hover:bg-gradient-to-r group-hover:from-[#007BFF] group-hover:to-[#00BFFF] group-hover:text-white text-gray-700 hover:text-white"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="flex items-center justify-center">
          Learn More
          <svg 
            className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </motion.button>

      {/* Hover Glow Effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#007BFF] to-[#00BFFF] opacity-0 group-hover:opacity-5 transition-opacity duration-500 -z-10 blur-xl" />
    </motion.div>
  );
}