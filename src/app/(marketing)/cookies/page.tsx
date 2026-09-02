import Link from 'next/link'

export const metadata = {
  title: 'Cookie Policy | Hbee Digitals',
  description: 'Cookie Policy for Hbee Digitals.',
}

const sections = [
  {
    title: 'What Are Cookies?',
    body: 'Cookies are small files stored on your device to help websites remember preferences, improve functionality, and understand visitor behavior.',
  },
  {
    title: 'How We Use Cookies',
    body: 'We may use cookies to improve website performance, understand traffic, personalize browsing, remember preferences, and improve user experience.',
  },
  {
    title: 'Analytics Cookies',
    body: 'Analytics cookies help us understand how visitors use our website, which pages are visited, and how we can improve the experience.',
  },
  {
    title: 'Functional Cookies',
    body: 'Functional cookies may remember your preferences, cookie choices, or settings that improve your browsing experience.',
  },
  {
    title: 'Managing Cookies',
    body: 'You can manage or disable cookies through your browser settings. Some parts of the website may not work as expected if cookies are disabled.',
  },
  {
    title: 'Updates to This Policy',
    body: 'We may update this Cookie Policy as our website, tools, or services change.',
  },
]

export default function CookiesPage() {
  return (
    <>
      <main className="min-h-screen bg-[var(--bg-page)] px-5 pb-20 pt-32 text-[var(--text-primary)] sm:px-6 md:px-10 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10">
            <p className="mb-4 inline-flex rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              Legal
            </p>
            <h1 className="text-5xl font-black tracking-[-0.04em] text-[var(--text-primary)]">Cookie Policy</h1>
            <p className="mt-5 max-w-2xl text-[var(--text-secondary)]">
              This page explains how Hbee Digitals may use cookies and similar technologies.
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
            <h2 className="text-xl font-black text-[var(--text-primary)]">Your choice matters</h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              You can accept or decline cookies using the cookie banner when visiting the website.
            </p>
            <Link href="/privacy" className="mt-5 inline-flex rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] hover:bg-[var(--accent-lime)]">
              View Privacy Policy
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}