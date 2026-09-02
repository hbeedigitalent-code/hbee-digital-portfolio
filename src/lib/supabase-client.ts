// src/lib/supabase-client.ts
import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

export const createClientComponentClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // During build, return a dummy client that won't throw
    if (typeof window === 'undefined') {
      return createClient('https://placeholder.supabase.co', 'placeholder-key')
    }
    throw new Error('Missing Supabase environment variables')
  }

  // Browser: cookie-backed session (via @supabase/ssr) so the auth state is
  // visible to server-side route protection (src/middleware.ts).
  if (typeof window !== 'undefined') {
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  // SSR render of a client component — no session on the server; anonymous only.
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}
