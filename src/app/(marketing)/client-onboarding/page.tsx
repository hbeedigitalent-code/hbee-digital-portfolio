// src/app/client-onboarding/page.tsx
import { NewOnboardingForm } from '@/components/onboarding/NewOnboardingForm'

export const metadata = {
  title: 'Client Onboarding | Hbee Digitals',
  description: 'Complete your onboarding to start your project with Hbee Digitals.',
}

export default function ClientOnboardingPage() {
  return (
    <>
      <main className="min-h-screen bg-[var(--bg-page)] py-12 md:py-20">
        <div className="container-custom">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">
                Client Onboarding
              </h1>
              <p className="text-[var(--text-muted)] text-base md:text-lg">
                Tell us about your project so we can get started.
              </p>
            </div>
            <NewOnboardingForm />
          </div>
        </div>
      </main>
    </>
  )
}