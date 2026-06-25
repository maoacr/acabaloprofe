import { createClient } from '@/infrastructure/supabase/server';
import type { ActionResult } from '@/domain/types';
import { registerSchema, type RegisterInput } from '@/lib/auth/zod-schemas';

/**
 * Register a new user.
 *
 * Flow:
 *  1. Validate input with Zod
 *  2. Create auth user via Supabase Auth (signUp)
 *  3. Insert profile row into public.users (id = auth.uid())
 *  4. Return userId
 *
 * Errors:
 *  - Field-level: username/email already taken → 'field' set
 *  - Form-level: any other error
 */
export async function registerUser(
  rawInput: unknown,
): Promise<ActionResult<{ userId: string }>> {
  // 1. Validate
  const parsed = registerSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first.message,
      field: first.path[0]?.toString(),
    };
  }
  const input: RegisterInput = parsed.data;

  const supabase = createClient();

  // 2. Create auth user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        username: input.username,
        country: input.country,
        city: input.city,
        timezone: input.timezone,
      },
    },
  });

  if (signUpError) {
    // Map known errors to field-level
    if (signUpError.message.toLowerCase().includes('already registered')) {
      return { ok: false, error: 'Este email ya está registrado', field: 'email' };
    }
    return { ok: false, error: signUpError.message };
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    return { ok: false, error: 'No se pudo crear el usuario' };
  }

  // 3. Insert profile row. RLS policy on users allows self-insert.
  // The RLS policy in PR3 migration will be: WITH CHECK (id = auth.uid())
  const { error: profileError } = await supabase.from('users').insert({
    id: userId,
    username: input.username,
    email: input.email,
    first_name: input.firstName,
    last_name: input.lastName,
    country: input.country,
    city: input.city,
    timezone: input.timezone,
    is_system_admin: false,
  });

  if (profileError) {
    // Map unique violation to field error
    if (profileError.code === '23505') {
      if (profileError.message.includes('username')) {
        return {
          ok: false,
          error: 'Este nombre de usuario ya está en uso',
          field: 'username',
        };
      }
      if (profileError.message.includes('email')) {
        return { ok: false, error: 'Este email ya está registrado', field: 'email' };
      }
    }
    return { ok: false, error: profileError.message };
  }

  return { ok: true, data: { userId } };
}
