import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/infrastructure/env';

/**
 * Browser-side Supabase client.
 *
 * Use in Client Components (`'use client'`).
 * Reads anon key from env, persists session in localStorage by default.
 *
 * For Server Components / Server Actions / Route Handlers,
 * use the server client instead.
 */
export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
