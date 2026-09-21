import { createBrowserClient } from '@supabase/ssr'

export function getCleanSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
}

export function createClient() {
  const url = getCleanSupabaseUrl()
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createBrowserClient(url, key)
}

