import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { getGroup } from '@/application/groups/get-group';
import { getMyPredictions } from '@/application/predictions/get-my-predictions';
import { isMatchOpen } from '@/domain/lock';
import { PredictionForm } from '@/components/predictions/PredictionForm';
import type { StartingPhaseCode } from '@/domain/types';

export const metadata = { title: 'Partidos' };

const PHASE_FILTER: Record<StartingPhaseCode, number> = {
  ALL: 0,
  FROM_ROUND_OF_16: 2,
  FROM_SEMIFINALS: 4,
  FINAL_ONLY: 5,
};

export default async function MatchesPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/grupos/${params.id}/partidos`);

  const group = await getGroup(params.id, user.id);
  if (!group) notFound();
  if (!group.isCurrentUserMember && !group.isCurrentUserAdmin) {
    redirect(`/unirse/${(group as { short_code?: string }).short_code ?? ''}`);
  }

  // Fetch matches for this group's tournament, respecting startingPhase
  const minOrder = PHASE_FILTER[group.startingPhase as StartingPhaseCode];

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      id, phase_id, scheduled_at, lock_at, status, is_knockout, matchday, home_goals, away_goals,
      phases!inner(order_index, name, type)
    `)
    .eq('tournament_id', group.tournamentId)
    .order('scheduled_at', { ascending: true });

  const filtered = (matches ?? []).filter((m) => {
    const phase = (m as unknown as { phases: { order_index: number } }).phases;
    return phase.order_index >= minOrder;
  });

  // Get team names
  const teamIds = new Set<string>();
  for (const m of filtered) {
    teamIds.add((m as unknown as { home_team_id: string }).home_team_id);
    teamIds.add((m as unknown as { away_team_id: string }).away_team_id);
  }
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name')
    .in('id', Array.from(teamIds));
  const teamById = new Map<string, { name: string; short: string }>();
  for (const t of teams ?? []) {
    teamById.set(t.id, { name: t.name, short: t.short_name });
  }

  // Get my predictions for this group
  const myPreds = await getMyPredictions(params.id);
  const myPredByMatch = new Map<string, { home: number; away: number }>();
  for (const p of myPreds) {
    myPredByMatch.set(p.matchId, { home: p.homeGoalsPredicted, away: p.awayGoalsPredicted });
  }

  // Group matches by phase name
  const byPhase = new Map<string, Array<{
    id: string;
    scheduledAt: string;
    lockAt: string;
    status: string;
    isKnockout: boolean;
    matchday: string | null;
    homeTeam: { name: string; short: string };
    awayTeam: { name: string; short: string };
  }>>();

  for (const m of filtered) {
    const phase = (m as unknown as { phases: { name: string; order_index: number } }).phases;
    const homeId = (m as unknown as { home_team_id: string }).home_team_id;
    const awayId = (m as unknown as { away_team_id: string }).away_team_id;
    const home = teamById.get(homeId) ?? { name: 'TBD', short: '???' };
    const away = teamById.get(awayId) ?? { name: 'TBD', short: '???' };

    const row = {
      id: m.id as string,
      scheduledAt: m.scheduled_at as string,
      lockAt: m.lock_at as string,
      status: m.status as string,
      isKnockout: m.is_knockout as boolean,
      matchday: (m.matchday as string | null) ?? null,
      homeTeam: home,
      awayTeam: away,
    };

    const list = byPhase.get(phase.name) ?? [];
    list.push(row);
    byPhase.set(phase.name, list);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{group.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Partidos y pronósticos</p>
      </div>

      {byPhase.size === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No hay partidos en la fase de tu grupo todavía.
        </p>
      ) : (
        Array.from(byPhase.entries()).map(([phaseName, matches]) => (
          <section key={phaseName}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {phaseName}
            </h2>
            <ul className="space-y-3">
              {matches.map((m) => {
                const myPred = myPredByMatch.get(m.id);
                const isOpen = isMatchOpen(m.status as 'scheduled', m.lockAt);
                const isFinished = m.status === 'finished';
                const isCancelled = m.status === 'cancelled';

                return (
                  <li
                    key={m.id}
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{m.matchday ?? phaseName}</span>
                      <span>
                        {isOpen && '🟢 Abierto'}
                        {m.status === 'scheduled' && !isOpen && '🟡 Cierra pronto'}
                        {m.status === 'live' && '🔴 En vivo'}
                        {isFinished && '✅ Finalizado'}
                        {isCancelled && '❌ Cancelado'}
                      </span>
                    </div>

                    <div className="mb-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.scheduledAt).toLocaleString('es-AR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="mt-1 text-lg font-bold">
                        {m.homeTeam.short} <span className="text-muted-foreground">vs</span> {m.awayTeam.short}
                      </p>
                    </div>

                    {isFinished && (m as unknown as { home_goals: number | null }).home_goals !== null ? (
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-xs text-muted-foreground">Resultado</p>
                        <p className="text-2xl font-bold tabular-nums">
                          {(m as unknown as { home_goals: number }).home_goals} − {(m as unknown as { away_goals: number }).away_goals}
                        </p>
                        {myPred && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Tu pronóstico: {myPred.home} − {myPred.away}
                          </p>
                        )}
                      </div>
                    ) : isCancelled ? (
                      <p className="text-center text-sm text-muted-foreground">Partido cancelado</p>
                    ) : (
                      <PredictionForm
                        matchId={m.id}
                        groupId={params.id}
                        homeTeamName={m.homeTeam.short}
                        awayTeamName={m.awayTeam.short}
                        initialHome={myPred?.home ?? 0}
                        initialAway={myPred?.away ?? 0}
                        isLocked={!isOpen}
                        lockAt={m.lockAt}
                        scheduledAt={m.scheduledAt}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
