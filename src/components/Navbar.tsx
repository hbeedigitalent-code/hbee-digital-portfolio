"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "Portfolio", href: "/#portfolio" },
  { label: "About", href: "/#about" },
  { label: "FAQ", href: "/#faq" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" }, // Now points to separate page
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activePath, setActivePath] = useState("/");

  // Handle scroll and active path
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    // Set active path based on current URL
    setActivePath(window.location.pathname);

    // Add event listener
    window.addEventListener('scroll', handleScroll);
    
    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Check if link is active
  const isActiveLink = (href: string) => {
    if (href === '/') {
      return activePath === '/';
    }
    return activePath.startsWith(href);
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200' 
          : 'bg-white border-b border-gray-100'
      }`}
    >
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-12 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img
              src="/svgs/logo.svg"
              alt="Hbee Digital Enterprise Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className={`font-bold text-lg tracking-wide transition-colors ${
              isScrolled ? 'text-[#004aad]' : 'text-[#007BFF]'
            }`}>
              HBEEDIGITAL
            </span>
            <span className="text-xs font-semibold text-[#00BFFF] tracking-wider">
              ENTERPRISE
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link, index) => (
            <motion.li 
              key={index} 
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href={link.href}
                className={`relative font-medium transition-all duration-300 ${
                  isActiveLink(link.href)
                    ? 'text-[#007BFF] font-semibold'
                    : isScrolled 
                    ? 'text-gray-700 hover:text-[#007BFF]' 
                    : 'text-gray-600 hover:text-[#004aad]'
                }`}
              >
                {link.label}
                {isActiveLink(link.href) && (
                  <motion.div
                    className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-[#007BFF] to-[#00BFFF]"
                    layoutId="navbar-indicator"
                  />
                )}
                {!isActiveLink(link.href) && (
                  <motion.div
                    className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#007BFF] to-[#00BFFF]"
                    whileHover={{ width: '100%' }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </Link>
            </motion.li>
          ))}
          
          {/* CTA Button */}
          <motion.li whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/contact"
              className="bg-gradient-to-r from-[#007BFF] to-[#00BFFF] text-white px-6 py-2.5 rounded-full font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300"
            >
              Get Started
            </Link>
          </motion.li>
        </ul>

        {/* Mobile Menu Button */}
        <motion.button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle Menu"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {open ? (
            <X size={28} className="text-[#007BFF]" />
          ) : (
            <Menu size={28} className="text-[#007BFF]" />
          )}
        </motion.button>

        {/* Mobile Nav */}
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-xl md:hidden"
          >
            <ul className="flex flex-col items-center py-6 gap-6">
              {navLinks.map((link, index) => (
                <motion.li 
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`text-lg font-medium transition-colors duration-300 ${
                      isActiveLink(link.href)
                        ? 'text-[#007BFF] font-semibold'
                        : 'text-gray-700 hover:text-[#007BFF]'
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
              
              {/* Mobile CTA Button */}
              <motion.li
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="bg-gradient-to-r from-[#007BFF] to-[#00BFFF] text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 inline-block"
                >
                  Get Started
                </Link>
              </motion.li>
            </ul>
          </motion.div>
        )}
      </nav>
    </motion.header>
  );
}