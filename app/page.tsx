// app/page.tsx
import Providers from "./providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import AboutSection from "@/components/AboutSection";
import PortfolioSection from "@/components/PortfolioSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Reveal from "@/components/Reveal";

export default function HomePage() {
  return (
    <Providers>
      <Navbar />
      <main className="bg-gradient-to-br from-[#0A1D37] to-[#0F3460] text-white overflow-hidden">
        {/* HERO SECTION */}
        <Reveal>
          <HeroSection />
        </Reveal>

        {/* SERVICES SECTION */}
        <Reveal delay={0.2}>
          <ServicesSection />
        </Reveal>

        {/* ABOUT SECTION */}
        <Reveal delay={0.3}>
          <AboutSection />
        </Reveal>

        {/* CTA SECTION */}
        <Reveal delay={0.6}>
          <CTASection />
        </Reveal>

        {/* PORTFOLIO SECTION */}
        <Reveal delay={0.4}>
          <PortfolioSection />
        </Reveal>

        {/* FAQ SECTION */}
        <Reveal delay={0.5}>
          <FAQSection />
        </Reveal>
      </main>
      <Footer />
    </Providers>
  );
}