import { createClient as createServiceClient } from '@supabase/supabase-js';
import { env } from '@/infrastructure/env';

/**
 * Service-role Supabase client.
 *
 * Bypasses ALL RLS. Use ONLY in:
 *  - API Routes for cron jobs (e.g., lock-predictions)
 *  - Migrations / seed scripts
 *  - Server Actions that need to bypass user-context RLS
 *    (with explicit justification in the action)
 *
 * NEVER expose this client to the browser. NEVER import in a
 * Client Component. NEVER pass the service-role key to the client.
 */
export function createServiceRoleClient() {
  return createServiceClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
