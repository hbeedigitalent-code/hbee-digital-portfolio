"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useQuery } from '@tanstack/react-query';

// Fetch portfolio projects from Shopify API
async function fetchPortfolioProjects() {
  const response = await fetch('/api/shopify/portfolio');
  if (!response.ok) {
    throw new Error('Failed to fetch portfolio projects');
  }
  return response.json();
}

export default function PortfolioSection() {
  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['portfolio'],
    queryFn: fetchPortfolioProjects,
  });

  // Loading state
  if (isLoading) {
    return (
      <section id="portfolio" className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50 to-[#007BFF]/10" />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="text-center mb-16">
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4 animate-pulse"></div>
            <div className="h-12 bg-gray-200 rounded w-96 mx-auto mb-6 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 mx-auto mb-8 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
                <div className="h-64 bg-gray-200 animate-pulse"></div>
                <div className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section id="portfolio" className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50 to-[#007BFF]/10" />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md mx-auto">
            <h3 className="text-red-800 text-lg font-semibold mb-2">Temporary Portfolio Unavailable</h3>
            <p className="text-red-600 mb-4">We're experiencing a temporary issue loading our portfolio. Our team has been notified.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="portfolio" className="relative py-20 overflow-hidden">
      {/* Blue-White Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50 to-[#007BFF]/10" />
      
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-[#00BFFF] rounded-full filter blur-3xl opacity-10 animate-float" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#007BFF] rounded-full filter blur-3xl opacity-5 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-[#007BFF]/20 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <motion.p 
            className="text-[#007BFF] font-semibold mb-4 tracking-widest uppercase text-sm"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
          >
            Our Work
          </motion.p>
          
          <motion.h2
            className="text-4xl md:text-5xl font-bold mb-6 text-gray-900"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            Featured <span className="text-[#007BFF]">Projects</span>
          </motion.h2>

          <motion.div 
            className="w-24 h-1 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] mx-auto mb-8"
            initial={{ width: 0 }}
            whileInView={{ width: 96 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            viewport={{ once: true }}
          />

          <motion.p
            className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            viewport={{ once: true }}
          >
            A showcase of our design, development, and branding work — built to
            help our clients dominate their digital presence.
          </motion.p>
        </motion.div>

        {/* Dynamic Project Grid from Shopify */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project: any, index: number) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.1,
                duration: 0.8,
                type: "spring",
              }}
              viewport={{ once: true }}
              className="group relative bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-[#007BFF] transition-all duration-500 shadow-lg hover:shadow-2xl hover:shadow-blue-500/20"
              whileHover={{ y: -10 }}
            >
              {/* Image Container */}
              <div className="relative h-64 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#007BFF]/10 to-[#00BFFF]/5 z-10" />
                <Image
                  src={project.image || '/images/portfolio/placeholder.jpg'}
                  alt={project.title}
                  width={600}
                  height={400}
                  className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#007BFF]/90 via-[#007BFF]/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                  <h3 className="text-xl font-bold text-white mb-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    {project.title}
                  </h3>
                  <p className="text-blue-100 text-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    {project.productType || 'Project'}
                  </p>
                  <p className="text-blue-50 text-xs mt-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-700 line-clamp-2">
                    {project.description}
                  </p>
                  
                  {/* View Project Button */}
                  <motion.a
                    href={`/portfolio/${project.handle}`}
                    className="mt-4 bg-white text-[#007BFF] px-4 py-2 rounded-full text-sm font-semibold opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 hover:bg-[#007BFF] hover:text-white text-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    View Project
                  </motion.a>
                </div>
              </div>

              {/* Content Below Image */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#007BFF] transition-colors">
                  {project.title}
                </h3>
                <p className="text-gray-600 text-sm">{project.productType || 'Digital Solution'}</p>
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {project.tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Hover Border Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#007BFF] to-[#00BFFF] opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
              <div className="absolute inset-[2px] rounded-2xl bg-white -z-10" />
            </motion.div>
          ))}
        </div>

        {/* Enhanced Empty State */}
        {projects.length === 0 && !isLoading && (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-12 max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Portfolio Coming Soon</h3>
              <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                We're currently curating our latest projects to showcase here. Our portfolio will feature 
                cutting-edge web development, stunning designs, and innovative digital solutions.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-lg">💻</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Web Development</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-lg">🎨</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">UI/UX Design</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-lg">🛒</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">E-Commerce</p>
                </div>
              </div>
              <p className="text-blue-600 font-medium">
                Check back soon or <a href="/contact" className="underline hover:text-blue-800">contact us</a> to see examples of our work!
              </p>
            </div>
          </motion.div>
        )}

        {/* CTA Section - Only show if there are projects */}
        {projects.length > 0 && (
          <motion.div
            className="text-center mt-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.a
              href="/portfolio"
              className="group relative bg-gradient-to-r from-[#007BFF] to-[#00BFFF] text-white px-8 py-4 rounded-full font-semibold hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-500 overflow-hidden inline-block"
              whileHover={{ 
                scale: 1.05,
                y: -2
              }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              <span className="relative z-10 flex items-center justify-center">
                View All Projects
                <svg 
                  className="w-5 h-5 ml-3 transform group-hover:translate-x-1 transition-transform duration-300" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </motion.a>
          </motion.div>
        )}
      </div>
    </section>
  );
}