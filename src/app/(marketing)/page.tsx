import HomePageClient from '@/components/home/HomePageClient'
import { supabase } from '@/lib/supabase'

export const revalidate = 60

export default async function HomePage() {
  // Seed the Hero from the server so the first paint already has the
  // admin-configured content — the client fetch in HomePageClient then
  // refreshes the same row, so there is no default → data content flash.
  let initialHero: Record<string, unknown> | undefined
  try {
    const { data } = await supabase.from('hero_section').select('*').single()
    initialHero = data ?? undefined
  } catch {
    initialHero = undefined
  }

  return <HomePageClient initialHero={initialHero} />
}
