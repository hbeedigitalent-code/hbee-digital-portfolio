import ContactSection from '@/components/sections/ContactSection'

export const metadata = {
  title: 'Contact Hbee Digitals | Start Your Project',
  description:
    'Contact Hbee Digitals to discuss website design, Shopify optimization, brand systems, conversion improvements, and digital growth support.',
}

export default function ContactPage() {
  return (
    <>
      <main className="bg-[var(--bg-page)]">
        <ContactSection />
      </main>
    </>
  )
}