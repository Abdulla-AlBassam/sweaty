import { createBrowserClient } from '@supabase/ssr'

// This client is used in Client Components (files with 'use client')
// It runs in the browser and handles auth state automatically
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
