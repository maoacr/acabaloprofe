'use server';

import { createClient } from '@/infrastructure/supabase/server';
import { createServiceRoleClient } from '@/infrastructure/supabase/service-role';
import type { ActionResult } from '@/domain/types';
import { loginSchema } from '@/lib/auth/zod-schemas';

/**
 * Sign in a user.
 *
 * Accepts either username OR email as `identifier`.
 * Always returns a generic error on failure to prevent account enumeration.
 */
export async function signIn(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first.message, field: first.path[0]?.toString() };
  }
  const { identifier, password } = parsed.data;

  // Detect whether the identifier is an email format.
  const isEmail = identifier.includes('@');
  const email = isEmail ? identifier : await resolveEmailFromUsername(identifier);

  if (!email) {
    return { ok: false, error: 'Credenciales inválidas' };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { ok: false, error: 'Credenciales inválidas' };
  }

  return { ok: true, data: { userId: data.user.id } };
}

/**
 * Resolve a username to its email via service-role lookup.
 * Returns null if no user with that username exists.
 *
 * We MUST use service-role here because the lookup happens before
 * authentication, and RLS on `public.users` will block anon reads
 * of the email column.
 */
async function resolveEmailFromUsername(username: string): Promise<string | null> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from('users')
    .select('email')
    .eq('username', username.toLowerCase())
    .single();

  if (error || !data) {
    return null;
  }
  return data.email;
}
