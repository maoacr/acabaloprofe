import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/infrastructure/supabase/middleware';

/**
 * Next.js middleware.
 *
 * Runs on every request. Refreshes the user session and gates
 * protected routes.
 *
 * Public routes (no auth required):
 *  - /
 *  - /login, /registro, /recuperar
 *  - /unirse/* (join page; the actual join action still requires auth)
 *  - /auth/* (callback, signout)
 *  - /api/cron/* (authed via CRON_SECRET header, not session)
 *  - /_next/* and static assets
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/grupos') ||
    pathname.startsWith('/perfil') ||
    pathname.startsWith('/admin');

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     * - image files (.png, .jpg, .svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
