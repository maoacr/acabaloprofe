import { createClient } from '@/infrastructure/supabase/server';
import type { Match } from '@/domain/types';
import type { StartingPhaseCode } from '@/domain/types';

const PHASE_MIN_ORDER: Record<StartingPhaseCode, number> = {
  ALL: 0,
  FROM_ROUND_OF_16: 2,
  FROM_SEMIFINALS: 4,
  FINAL_ONLY: 5,
};

export interface GroupMatchRow extends Omit<Match, 'homeTeam' | 'awayTeam'> {
  homeTeam: { id: string; name: string; shortName: string; flagUrl: string | null };
  awayTeam: { id: string; name: string; shortName: string; flagUrl: string | null };
  phaseName: string;
  phaseOrder: number;
}

/**
 * Get all matches for a group's tournament, filtered by the group's
 * startingPhase window. Includes team info and phase info.
 *
 * For non-admin viewers, home_goals and away_goals are nulled out for
 * matches with status 'scheduled' or 'live' (they shouldn't see the
 * result before it's entered).
 */
export async function getGroupMatches(
  tournamentId: string,
  startingPhase: StartingPhaseCode,
  isSystemAdmin: boolean = false,
): Promise<GroupMatchRow[]> {
  const supabase = createClient();
  const minOrder = PHASE_MIN_ORDER[startingPhase];

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, tournament_id, phase_id, scheduled_at, lock_at, status, is_knockout, matchday,
      home_goals, away_goals,
      phases!inner(name, order_index),
      home_team:teams!matches_home_team_id_fkey(id, name, short_name, flag_url),
      away_team:teams!matches_away_team_id_fkey(id, name, short_name, flag_url)
    `)
    .eq('tournament_id', tournamentId)
    .order('scheduled_at', { ascending: true });

  if (error || !data) return [];

  const result: GroupMatchRow[] = [];
  for (const m of data as unknown as Array<Record<string, unknown>>) {
    const phase = m.phases as { name: string; order_index: number };
    if (phase.order_index < minOrder) continue;

    const homeRaw = m.home_team as { id: string; name: string; short_name: string; flag_url: string | null };
    const awayRaw = m.away_team as { id: string; name: string; short_name: string; flag_url: string | null };

    // Hide live results from non-admins for unfinished matches
    const status = m.status as 'scheduled' | 'live' | 'finished' | 'cancelled';
    const hideResult = !isSystemAdmin && (status === 'scheduled' || status === 'live');
    const homeGoals = hideResult ? null : (m.home_goals as number | null);
    const awayGoals = hideResult ? null : (m.away_goals as number | null);

    result.push({
      id: m.id as string,
      tournamentId: m.tournament_id as string,
      phaseId: m.phase_id as string,
      homeTeam: {
        id: homeRaw.id,
        name: homeRaw.name,
        shortName: homeRaw.short_name,
        flagUrl: homeRaw.flag_url,
      },
      awayTeam: {
        id: awayRaw.id,
        name: awayRaw.name,
        shortName: awayRaw.short_name,
        flagUrl: awayRaw.flag_url,
      },
      scheduledAt: m.scheduled_at as string,
      lockAt: m.lock_at as string,
      status,
      homeGoals,
      awayGoals,
      isKnockout: m.is_knockout as boolean,
      matchday: (m.matchday as string | null) ?? null,
      phaseName: phase.name,
      phaseOrder: phase.order_index,
    });
  }

  return result;
}
