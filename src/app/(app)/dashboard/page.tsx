import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/infrastructure/supabase/server';
import { listUserGroups } from '@/application/groups/list-user-groups';
import { Button } from '@/components/ui/Button';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const groups = await listUserGroups(user.id);
  const nextGroup = groups.find((g) => g.nextMatch !== null);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hola, @{user.user_metadata?.username ?? 'player'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tus pollas y próximos partidos.</p>
      </div>

      {nextGroup && nextGroup.nextMatch && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950">
          <p className="text-xs font-semibold uppercase text-brand-700 dark:text-brand-300">Próximo partido</p>
          <p className="mt-1 text-lg font-bold">
            {nextGroup.nextMatch.homeTeamName} <span className="text-muted-foreground">vs</span> {nextGroup.nextMatch.awayTeamName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(nextGroup.nextMatch.scheduledAt).toLocaleString('es-AR')}
          </p>
          <Link href={`/grupos/${nextGroup.id}/partidos`} className="mt-3 inline-block">
            <Button>Hacer pronóstico</Button>
          </Link>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mis grupos</h2>
          <Link href="/grupos/nuevo" className="text-sm text-brand-600 hover:underline">
            + Crear grupo
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Todavía no estás en ningún grupo.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/grupos/nuevo">
                <Button>Crear grupo</Button>
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {groups.slice(0, 5).map((g) => (
              <li key={g.id}>
                <Link
                  href={`/grupos/${g.id}`}
                  className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        #{g.position || '—'} · {g.totalPoints} pts
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {g.activeParticipants} jugador{g.activeParticipants === 1 ? '' : 'es'}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
