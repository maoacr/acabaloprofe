import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { signOutAction } from '@/application/auth/logout-action';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-lg font-bold">
            Acabalo <span className="text-brand-500">Profe</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/grupos" className="text-muted-foreground hover:text-foreground">Grupos</Link>
            <span className="text-muted-foreground">·</span>
            <span className="hidden text-muted-foreground sm:inline">@{profile?.username ?? 'user'}</span>
            <form action={signOutAction}>
              <button type="submit" className="text-muted-foreground hover:text-foreground">
                Salir
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="flex-1 pb-safe">{children}</main>
    </div>
  );
}
