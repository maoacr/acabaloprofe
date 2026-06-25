import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/infrastructure/supabase/server';
import { env } from '@/infrastructure/env';

/**
 * Supabase auth callback.
 *
 * Handles:
 *  - Signup confirmation (PKCE flow)
 *  - Magic link (Fase 2)
 *  - Password recovery (token exchange)
 *
 * The user lands here after clicking the email link. Supabase Auth
 * exchanges the `code` query param for a session cookie via the
 * server client, then we redirect them to the appropriate page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type'); // 'recovery' | 'signup' | 'magiclink' | null
  const next = searchParams.get('redirect') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Recovery flow: user needs to set a new password.
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/recuperar/nueva`);
  }

  // All other flows go to the original target.
  return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}${next}`);
}
