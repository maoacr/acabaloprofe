'use server';

import { createClient } from '@/infrastructure/supabase/server';
import { env } from '@/infrastructure/env';
import type { ActionResult } from '@/domain/types';
import { recoverPasswordSchema } from '@/lib/auth/zod-schemas';

/**
 * Request a password recovery email.
 *
 * Always returns ok=true regardless of whether the email is registered,
 * to prevent account enumeration.
 *
 * Supabase Auth sends the email using its built-in template. The email
 * contains a link to ${APP_URL}/auth/callback?type=recovery which the
 * callback route exchanges for a session.
 */
export async function recoverPassword(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = recoverPasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first.message, field: first.path[0]?.toString() };
  }
  const { email } = parsed.data;

  const supabase = createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery`,
  });

  // Always return the same message regardless of whether the email exists.
  return { ok: true, data: undefined };
}
