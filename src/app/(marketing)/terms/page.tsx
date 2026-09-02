import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | Hbee Digitals',
  description: 'Terms of Service for Hbee Digitals.',
}

const sections = [
  {
    title: 'Acceptance of Terms',
    body: 'By using our website or requesting our services, you agree to these terms and any project-specific agreement provided by Hbee Digitals.',
  },
  {
    title: 'Services',
    body: 'We provide digital services including website design, Shopify optimization, branding, digital systems, support, consulting, and related services.',
  },
  {
    title: 'Project Scope',
    body: 'Each project will follow the agreed scope, deliverables, timeline, and pricing discussed before work begins. Additional requests may require a revised quote.',
  },
  {
    title: 'Payments',
    body: 'Payments must be made according to the agreed invoice or payment schedule. Work may be paused if payment is delayed.',
  },
  {
    title: 'Client Responsibilities',
    body: 'Clients are responsible for providing accurate information, required access, brand materials, content, feedback, and approvals needed to complete the project.',
  },
  {
    title: 'Revisions',
    body: 'Revisions are handled based on the agreed project scope. Extra revisions or major direction changes may attract additional fees.',
  },
  {
    title: 'Limitation of Liability',
    body: 'Hbee Digitals is not liable for indirect losses, third-party platform issues, hosting outages, payment provider issues, or business losses outside our direct control.',
  },
  {
    title: 'Changes to Terms',
    body: 'We may update these terms when necessary. Continued use of our website or services means you accept the updated terms.',
  },
]

export default function TermsPage() {
  return (
    <>
      <main className="min-h-screen bg-[var(--bg-page)] px-5 pb-20 pt-32 text-[var(--text-primary)] sm:px-6 md:px-10 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10">
            <p className="mb-4 inline-flex rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              Legal
            </p>
            <h1 className="text-5xl font-black tracking-[-0.04em] text-[var(--text-primary)]">Terms of Service</h1>
            <p className="mt-5 max-w-2xl text-[var(--text-secondary)]">
              These terms explain how our services, projects, payments, and responsibilities are handled.
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
            <h2 className="text-xl font-black text-[var(--text-primary)]">Need clarification?</h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              Contact us before starting a project if you need any part of these terms explained.
            </p>
            <Link href="/contact" className="mt-5 inline-flex rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] hover:bg-[var(--accent-lime)]">
              Contact Us
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}