import { createClient } from '@/infrastructure/supabase/server';
import type { Prediction } from '@/domain/types';
import { isMatchLocked } from '@/domain/lock';

/**
 * Get all predictions for a specific match in a group.
 * RLS handles the visibility: locked predictions of others are visible,
 * unlocked ones are NOT.
 */
export interface PredictionWithUser {
  id: string;
  userId: string;
  username: string;
  homeGoalsPredicted: number;
  awayGoalsPredicted: number;
  isLocked: boolean;
  totalPoints: number;
  submittedAt: string;
}

export async function getGroupPredictionsForMatch(
  matchId: string,
  groupId: string,
): Promise<PredictionWithUser[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('predictions')
    .select(`
      id, user_id, home_goals_predicted, away_goals_predicted,
      is_locked, total_points, submitted_at,
      users!inner(username)
    `)
    .eq('match_id', matchId)
    .eq('group_id', groupId);

  if (error || !data) return [];

  return (data as unknown as Array<Record<string, unknown>>).map((p) => {
    const u = p.users as { username: string };
    return {
      id: p.id as string,
      userId: p.user_id as string,
      username: u.username,
      homeGoalsPredicted: p.home_goals_predicted as number,
      awayGoalsPredicted: p.away_goals_predicted as number,
      isLocked: p.is_locked as boolean,
      totalPoints: p.total_points as number,
      submittedAt: p.submitted_at as string,
    } satisfies PredictionWithUser;
  });
}

/**
 * Check if a specific match is locked (for the lock indicator UI).
 * Returns null if the match doesn't exist.
 */
export async function isMatchLockedById(matchId: string): Promise<boolean | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('matches')
    .select('lock_at')
    .eq('id', matchId)
    .maybeSingle();

  if (error || !data) return null;
  return isMatchLocked((data as { lock_at: string }).lock_at);
}
