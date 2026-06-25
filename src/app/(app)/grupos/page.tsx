import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { Button } from '@/components/ui/Button';
import { listUserGroups } from '@/application/groups/list-user-groups';

export const metadata = { title: 'Mis grupos' };

export default async function MyGroupsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/grupos');

  const groups = await listUserGroups(user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis grupos</h1>
        <Link href="/grupos/nuevo">
          <Button>+ Crear grupo</Button>
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">
            No estás en ningún grupo.{' '}
            <Link href="/grupos/nuevo" className="text-brand-600 hover:underline">
              Creá uno
            </Link>{' '}
            o uníte con un código de invitación.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/grupos/${g.id}`}
                className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold">{g.name}</h2>
                    {g.description && (
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{g.description}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">Posición</p>
                    <p className="text-2xl font-bold">{g.position || '—'}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {g.activeParticipants} participante{g.activeParticipants === 1 ? '' : 's'}
                  </span>
                  <span className="font-semibold text-brand-600">{g.totalPoints} pts</span>
                </div>
                {g.nextMatch && (
                  <div className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                    Próximo: {g.nextMatch.homeTeamName} vs {g.nextMatch.awayTeamName}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
