import ProcessSection from '@/components/sections/ProcessSection'

export const metadata = {
  title: 'Our Process | Hbee Digitals',
  description:
    'See how Hbee Digitals turns ideas into scalable websites, Shopify systems, brand experiences, and digital growth systems.',
}

export default function ProcessPage() {
  return (
    <>
      <main className="bg-[var(--bg-page)]">
        <ProcessSection />
      </main>
    </>
  )
}