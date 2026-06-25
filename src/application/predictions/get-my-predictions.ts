import { createClient } from '@/infrastructure/supabase/server';
import type { Prediction } from '@/domain/types';

/**
 * Get all predictions submitted by the current user in a group.
 * Includes match info (home/away team, scheduled_at, status).
 */
export interface MyPredictionRow extends Prediction {
  match: {
    id: string;
    scheduledAt: string;
    lockAt: string;
    status: string;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamShort: string;
    awayTeamShort: string;
    isKnockout: boolean;
    matchday: string | null;
  };
}

export async function getMyPredictions(groupId: string): Promise<MyPredictionRow[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('predictions')
    .select(`
      id, user_id, match_id, group_id, home_goals_predicted, away_goals_predicted,
      is_locked, winner_points, home_goals_points, away_goals_points, diff_points, total_points,
      submitted_at, updated_at,
      matches!inner(
        id, scheduled_at, lock_at, status, is_knockout, matchday,
        home_team_id, away_team_id
      )
    `)
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false });

  if (error || !data) return [];

  // Resolve team names
  const teamIds = new Set<string>();
  for (const p of data) {
    const m = (p as unknown as { matches: { home_team_id: string; away_team_id: string } }).matches;
    teamIds.add(m.home_team_id);
    teamIds.add(m.away_team_id);
  }

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name')
    .in('id', Array.from(teamIds));

  const teamById = new Map<string, { name: string; short: string }>();
  for (const t of teams ?? []) {
    teamById.set(t.id, { name: t.name, short: t.short_name });
  }

  return (data as unknown as Array<Record<string, unknown>>).map((p) => {
    const m = p.matches as { id: string; scheduled_at: string; lock_at: string; status: string; is_knockout: boolean; matchday: string | null; home_team_id: string; away_team_id: string };
    const home = teamById.get(m.home_team_id);
    const away = teamById.get(m.away_team_id);
    return {
      id: p.id as string,
      userId: p.user_id as string,
      matchId: p.match_id as string,
      groupId: p.group_id as string,
      homeGoalsPredicted: p.home_goals_predicted as number,
      awayGoalsPredicted: p.away_goals_predicted as number,
      isLocked: p.is_locked as boolean,
      pointsEarned:
        (p.total_points as number) > 0
          ? {
              winnerPoints: p.winner_points as number,
              homeGoalsPoints: p.home_goals_points as number,
              awayGoalsPoints: p.away_goals_points as number,
              diffPoints: p.diff_points as number,
              totalPoints: p.total_points as number,
            }
          : null,
      submittedAt: p.submitted_at as string,
      updatedAt: p.updated_at as string,
      match: {
        id: m.id,
        scheduledAt: m.scheduled_at,
        lockAt: m.lock_at,
        status: m.status,
        homeTeamName: home?.name ?? 'TBD',
        awayTeamName: away?.name ?? 'TBD',
        homeTeamShort: home?.short ?? '???',
        awayTeamShort: away?.short ?? '???',
        isKnockout: m.is_knockout,
        matchday: m.matchday,
      },
    } satisfies MyPredictionRow;
  });
}
