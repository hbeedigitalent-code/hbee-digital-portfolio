// app/contact/page.tsx
import ContactSection from "@/components/ContactSection";
import Reveal from "@/components/Reveal";

export default function ContactPage() {
  return (
    <main className="bg-gradient-to-br from-[#0A1D37] to-[#0F3460] text-white overflow-hidden min-h-screen pt-16">
      {/* CONTACT SECTION ONLY */}
      <Reveal>
        <ContactSection />
      </Reveal>
    </main>
  );
}