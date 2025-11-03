// components/FAQSection.tsx
'use client';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';

export default function FAQSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [activeCategory, setActiveCategory] = useState('general');
  const [openItems, setOpenItems] = useState<number[]>([]);

  const faqData = [
    // General Questions
    {
      question: "What services does Hbee Digital Enterprise offer?",
      answer: "We offer comprehensive digital solutions including web development, e-commerce solutions, mobile app development, UI/UX design, digital marketing, and branding services tailored to your business needs.",
      category: "general"
    },
    {
      question: "How long does it take to complete a website?",
      answer: "Project timelines vary based on complexity. A basic website typically takes 2-4 weeks, while complex e-commerce platforms may require 6-8 weeks. We provide detailed timelines during our initial consultation.",
      category: "general"
    },
    {
      question: "Why work with Hbee Digital Enterprise?",
      answer: "We combine technical expertise with creative design, delivering solutions that not only look great but also drive results. Our client-focused approach ensures we understand your business goals and deliver measurable outcomes.",
      category: "general"
    },
    
    // Development Questions
    {
      question: "Do you provide customized website design services?",
      answer: "Absolutely! Every project we undertake is custom-tailored to your specific needs. We don't use templates - each design is created from scratch to ensure uniqueness and optimal performance.",
      category: "development"
    },
    {
      question: "How many Shopify projects has Hbee Digital completed?",
      answer: "We've successfully delivered over 50 Shopify projects, ranging from simple stores to complex multi-vendor marketplaces with custom functionality and integrations.",
      category: "development"
    },
    {
      question: "Do you handle website migrations between platforms?",
      answer: "Yes, we specialize in seamless platform migrations. We've successfully migrated websites from BigCommerce, Magento, WooCommerce, Wix, and other platforms to Shopify and modern frameworks.",
      category: "development"
    },
    
    // Services Questions
    {
      question: "Can you help with e-commerce SEO and digital marketing?",
      answer: "Definitely! Our digital marketing services include comprehensive SEO strategies, social media marketing, PPC campaigns, and conversion rate optimization specifically tailored for e-commerce businesses.",
      category: "services"
    },
    {
      question: "Do you have experience with mobile-responsive design?",
      answer: "Mobile-responsive design is at the core of our development process. All our projects are built with a mobile-first approach, ensuring optimal performance across all devices and screen sizes.",
      category: "services"
    },
    {
      question: "Do you provide content creation services?",
      answer: "Yes, we offer complete content creation services including professional copywriting, graphic design, video production, and branding materials to ensure your digital presence is cohesive and compelling.",
      category: "services"
    },
    
    // Pricing Questions
    {
      question: "How much does a new website design cost?",
      answer: "Website projects start at $2,500 for basic sites and can go up to $15,000+ for complex e-commerce platforms. We provide transparent pricing based on your specific requirements during our discovery phase.",
      category: "pricing"
    },
    {
      question: "How much does it cost to hire a Shopify expert from this agency?",
      answer: "Our Shopify development services start at $75/hour for ongoing support, with project-based pricing available. We offer competitive rates while maintaining the highest quality standards in the industry.",
      category: "pricing"
    },
    
    // Process Questions
    {
      question: "How long will it take to complete a typical web development project?",
      answer: "Most web development projects take 4-8 weeks from concept to launch. Complex projects with custom features may take longer. We provide detailed project timelines with milestones during our planning phase.",
      category: "process"
    },
    {
      question: "How quickly can we get started with a new project?",
      answer: "We can typically begin new projects within 1-2 weeks of signing the agreement. For urgent projects, we offer expedited onboarding. Contact us to check our current availability.",
      category: "process"
    }
  ];

  const categories = [
    { key: 'general', label: 'General' },
    { key: 'development', label: 'Development' },
    { key: 'services', label: 'Services' },
    { key: 'pricing', label: 'Pricing' },
    { key: 'process', label: 'Process' }
  ];

  const filteredFaqs = faqData.filter(item => item.category === activeCategory);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <section id="faq" className="py-20 bg-white relative overflow-hidden">
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
            FAQ
          </motion.p>
          
          <motion.h2 
            className="text-4xl md:text-5xl font-bold mb-6 text-gray-900"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            Frequently <span className="text-gradient">Asked Questions</span>
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
            Find answers to common questions about our services, process, and pricing. 
            Can't find what you're looking for? Contact us directly.
          </motion.p>
        </motion.div>

        {/* Category Filters */}
        <motion.div
          className="flex flex-wrap justify-center gap-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          {categories.map((category) => (
            <motion.button
              key={category.key}
              onClick={() => setActiveCategory(category.key)}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeCategory === category.key
                  ? 'bg-gradient-to-r from-[#007BFF] to-[#00BFFF] text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {category.label}
            </motion.button>
          ))}
        </motion.div>

        {/* FAQ Items */}
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 1.0, duration: 0.8 }}
        >
          <div className="space-y-4">
            {filteredFaqs.map((item, index) => (
              <FAQItem 
                key={index}
                item={item}
                index={index}
                isOpen={openItems.includes(index)}
                onToggle={() => toggleItem(index)}
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
          <div className="bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-2xl p-8 text-white">
            <motion.h3 
              className="text-2xl md:text-3xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 2.0 }}
            >
              Still have questions?
            </motion.h3>
            <motion.p 
              className="text-blue-100 mb-6 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 2.1 }}
            >
              Can't find the answer you're looking for? Our team is here to help with any questions about our services.
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 2.2 }}
            >
              <motion.a
                href="#contact"
                className="bg-white text-[#007BFF] px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Contact Us
              </motion.a>
              <motion.a
                href="tel:+2349121913997"
                className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-[#007BFF] transition-colors duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Call Now
              </motion.a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// FAQItem Component
function FAQItem({ item, index, isOpen, onToggle, isInView }: { 
  item: any; 
  index: number; 
  isOpen: boolean; 
  onToggle: () => void;
  isInView: boolean;
}) {
  return (
    <motion.div
      className="bg-white rounded-2xl border border-gray-200 hover:border-[#007BFF] transition-all duration-500 shadow-lg hover:shadow-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ 
        delay: 1.2 + index * 0.1,
        duration: 0.6
      }}
      whileHover={{ 
        y: -2,
        transition: { duration: 0.3 }
      }}
    >
      <motion.button
        onClick={onToggle}
        className="w-full px-6 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-300"
        whileHover={{ x: 4 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 pr-8">
          {item.question}
        </h3>
        <motion.div
          className="flex-shrink-0 w-6 h-6 text-[#007BFF]"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </motion.button>
      
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="px-6 pb-6">
          <p className="text-gray-600 leading-relaxed">
            {item.answer}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}