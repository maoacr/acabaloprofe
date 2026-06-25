'use server';

import { createClient } from '@/infrastructure/supabase/server';
import { createServiceRoleClient } from '@/infrastructure/supabase/service-role';
import type { ActionResult } from '@/domain/types';
import { registerSchema, type RegisterInput } from '@/lib/auth/zod-schemas';

/**
 * Register a new user.
 *
 * Flow:
 *  1. Validate input with Zod
 *  2. Create auth user via Supabase Auth (signUp) — the auth.users trigger
 *     `handle_new_user()` (in init_schema.sql) will auto-create the
 *     public.users row from user_metadata
 *  3. As defense-in-depth, also insert public.users via service role.
 *     This handles the case where the trigger was not applied (e.g.,
 *     migrations were run against a different DB).
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

  // 2. Create auth user. The user_metadata is what the handle_new_user
  // trigger reads (if it exists in this DB).
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
    if (signUpError.message.toLowerCase().includes('already registered')) {
      return { ok: false, error: 'Este email ya está registrado', field: 'email' };
    }
    return { ok: false, error: signUpError.message };
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    return { ok: false, error: 'No se pudo crear el usuario' };
  }

  // 3. Defense-in-depth: insert the public.users row via service role,
  // which bypasses RLS. This is safe because we're inserting with the
  // just-created auth user id, and service role only runs in the server.
  // If the handle_new_user trigger already created the row, this will
  // hit a unique violation (23505) which we treat as success.
  const service = createServiceRoleClient();
  const { error: profileError } = await service.from('users').insert({
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
    // 23505 = unique_violation. If it's username/email, surface as field error.
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
      // 23505 on the id PK means the trigger already created the row.
      // That's success — the profile is in place.
      if (profileError.message.includes('id') || profileError.details?.includes('id')) {
        return { ok: true, data: { userId } };
      }
    }
    return { ok: false, error: profileError.message };
  }

  return { ok: true, data: { userId } };
}
