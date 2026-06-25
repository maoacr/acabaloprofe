import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { listUserGroups } from '@/application/groups/list-user-groups';
import { getGroupMatches } from '@/application/matches/get-group-matches';
import { Button } from '@/components/ui/Button';

export const metadata = { title: 'Dashboard' };

function formatCountdown(targetIso: string): string {
  const target = new Date(targetIso).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return 'En vivo o finalizado';
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `en ${days}d ${hours}h`;
  if (hours > 0) return `en ${hours}h ${mins}m`;
  return `en ${mins}m`;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const groups = await listUserGroups(user.id);

  // Get the next scheduled match across all user's groups
  let nextMatch: {
    groupId: string;
    groupName: string;
    matchId: string;
    homeTeam: string;
    awayTeam: string;
    scheduledAt: string;
  } | null = null;

  for (const g of groups) {
    if (!g.nextMatch) continue;
    const matches = await getGroupMatches(g.tournamentId, g.startingPhase as 'ALL' | 'FROM_ROUND_OF_16' | 'FROM_SEMIFINALS' | 'FINAL_ONLY', false);
    const upcoming = matches.find(
      (m) => m.status === 'scheduled' && new Date(m.scheduledAt).getTime() > Date.now(),
    );
    if (!upcoming) continue;
    if (!nextMatch || new Date(upcoming.scheduledAt) < new Date(nextMatch.scheduledAt)) {
      nextMatch = {
        groupId: g.id,
        groupName: g.name,
        matchId: upcoming.id,
        homeTeam: upcoming.homeTeam.shortName,
        awayTeam: upcoming.awayTeam.shortName,
        scheduledAt: upcoming.scheduledAt,
      };
    }
  }

  const totalPoints = groups.reduce((sum, g) => sum + g.totalPoints, 0);
  const bestPosition = groups.reduce((min, g) => (g.position > 0 && g.position < min ? g.position : min), 999);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Hola, @{user.user_metadata?.username ?? 'player'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Tus pollas y próximos partidos.</p>
      </div>

      {/* Stats row */}
      {groups.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Grupos</p>
            <p className="mt-1 text-2xl font-bold">{groups.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Puntos</p>
            <p className="mt-1 text-2xl font-bold text-brand-600">{totalPoints}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Mejor pos.</p>
            <p className="mt-1 text-2xl font-bold">
              {bestPosition === 999 ? '—' : `#${bestPosition}`}
            </p>
          </div>
        </div>
      )}

      {/* Next match widget */}
      {nextMatch && (
        <div className="rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-background p-5 dark:border-brand-800 dark:from-brand-950">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
            Próximo partido
          </p>
          <p className="mt-1 text-3xl font-extrabold">
            {nextMatch.homeTeam} <span className="text-muted-foreground">vs</span> {nextMatch.awayTeam}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(nextMatch.scheduledAt).toLocaleString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            <span className="text-brand-600">({formatCountdown(nextMatch.scheduledAt)})</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            En: <Link href={`/grupos/${nextMatch.groupId}`} className="text-brand-600 hover:underline">{nextMatch.groupName}</Link>
          </p>
          <Link href={`/grupos/${nextMatch.groupId}/partidos`} className="mt-4 inline-block">
            <Button>Hacer pronóstico</Button>
          </Link>
        </div>
      )}

      {/* Groups list */}
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
              <Link href="/">
                <Button variant="secondary">Tengo código</Button>
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {groups.slice(0, 5).map((g) => (
              <li key={g.id}>
                <Link
                  href={`/grupos/${g.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      #{g.position || '—'} · {g.totalPoints} pts
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {g.activeParticipants} jugador{g.activeParticipants === 1 ? '' : 'es'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
