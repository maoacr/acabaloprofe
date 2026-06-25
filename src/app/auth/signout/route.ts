import { NextResponse } from 'next/server';
import { createClient } from '@/infrastructure/supabase/server';

/**
 * POST /auth/signout
 * Server-side signout. Clears the session cookie and redirects to /login.
 *
 * We use POST (not GET) so the action can't be triggered by a malicious
 * image tag or link preview.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
