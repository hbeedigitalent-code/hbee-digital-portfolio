import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | Hbee Digitals',
  description: 'Privacy Policy for Hbee Digitals.',
}

const sections = [
  {
    title: 'Information We Collect',
    body: 'We may collect your name, email address, phone number, company name, project details, and any information you submit through our contact forms or communication channels.',
  },
  {
    title: 'How We Use Your Information',
    body: 'We use your information to respond to enquiries, provide services, improve our website, manage client communication, send updates, and maintain business records.',
  },
  {
    title: 'Newsletter & Communication',
    body: 'If you subscribe to our newsletter, we may send you helpful updates, insights, and service-related content. You may unsubscribe at any time.',
  },
  {
    title: 'Cookies & Analytics',
    body: 'We may use cookies and analytics tools to understand website performance, improve user experience, and measure traffic behavior.',
  },
  {
    title: 'Data Protection',
    body: 'We take reasonable steps to protect your information from unauthorized access, loss, misuse, or disclosure.',
  },
  {
    title: 'Third-Party Services',
    body: 'We may use trusted third-party platforms such as Supabase, Vercel, Resend, analytics tools, and payment or communication providers to operate our services.',
  },
  {
    title: 'Your Rights',
    body: 'You may request access, correction, or deletion of your personal information by contacting us directly.',
  },
]

export default function PrivacyPage() {
  return (
    <>
      <main className="min-h-screen bg-[var(--bg-page)] px-5 pb-20 pt-32 text-[var(--text-primary)] sm:px-6 md:px-10 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10">
            <p className="mb-4 inline-flex rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              Legal
            </p>
            <h1 className="text-5xl font-black tracking-[-0.04em] text-[var(--text-primary)]">Privacy Policy</h1>
            <p className="mt-5 max-w-2xl text-[var(--text-secondary)]">
              This policy explains how Hbee Digitals collects, uses, and protects information shared with us.
            </p>
          </div>

          <div className="space-y-5">
            {sections.map((section) => (
              <section key={section.title} className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-6 transition hover:border-[var(--accent)]/25">
                <h2 className="text-2xl font-black text-[var(--text-primary)]">{section.title}</h2>
                <p className="mt-3 leading-7 text-[var(--text-secondary)]">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-[1.5rem] border border-[var(--accent)]/20 bg-[var(--accent)]/10 p-6">
            <h2 className="text-xl font-black text-[var(--text-primary)]">Contact Us</h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              For privacy questions, contact us through our contact page.
            </p>
            <Link href="/contact" className="mt-5 inline-flex rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] hover:bg-[var(--accent-lime)]">
              Contact Hbee Digitals
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}