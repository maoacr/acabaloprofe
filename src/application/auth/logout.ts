import { createClient } from '@/infrastructure/supabase/server';
import type { ActionResult } from '@/domain/types';

/**
 * Sign out the current user.
 * Clears the session cookies via the Supabase client.
 */
export async function signOut(): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { ok: false, error: 'No se pudo cerrar la sesión' };
  }
  return { ok: true, data: undefined };
}
