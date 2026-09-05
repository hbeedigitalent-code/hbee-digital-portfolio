// src/app/admin-2fa-challenge/page.tsx
//
// Deliberately NOT nested under src/app/admin/ — that is the whole fix for
// the shell-leak bug. Next.js only applies src/app/admin/layout.tsx (the
// sidebar/header/nav dashboard shell) to routes nested inside that
// directory; this route is a top-level sibling, so it renders with only the
// root layout (site chrome: theme script, fonts, StructuredData — no admin
// shell) plus whatever this page itself renders below.
//
// Middleware treats this exact path as part of the admin area for Layers 1-2
// (session + active admin_users) but exempts it from Layer 3 (the 2FA
// cookie) — see ADMIN_2FA_CHALLENGE_PATH in src/middleware.ts, and the
// matching entry in this file's own matcher config.
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isSafeAdminRedirect } from '@/lib/admin-2fa-redirect'
import TwoFactorChallengeForm from './TwoFactorChallengeForm'

export default async function TwoFactorChallengePage({
  searchParams,
}: {
  searchParams: { next?: string }
}) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Defense in depth: middleware already enforces this, but never render the
  // challenge for a request that somehow arrives without a session.
  if (!user) {
    redirect('/admin/login')
  }

  const next = isSafeAdminRedirect(searchParams.next) ? searchParams.next : '/admin/dashboard'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] p-4">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent)]/7 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[var(--accent-lime)]/5 blur-[130px]" />
      </div>

      <TwoFactorChallengeForm next={next} />
    </div>
  )
}
