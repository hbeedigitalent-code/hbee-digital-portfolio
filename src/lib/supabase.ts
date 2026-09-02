// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Handle build time gracefully
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
      console.error('Missing Supabase environment variables')
    }
    return createClient('https://placeholder.supabase.co', 'placeholder-key')
  }

  // Browser: cookie-backed session (via @supabase/ssr) so the auth state is
  // visible to server-side route protection (src/middleware.ts). Same client
  // API surface as before — `.auth`, `.from`, `.storage`, `.rpc`, `.channel`.
  if (typeof window !== 'undefined') {
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  // Server import path — used by a handful of server components / route handlers
  // for anonymous reads only (there is no user session on the server here).
  // Behaviour unchanged from before.
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

export const supabase = createSupabaseClient()
