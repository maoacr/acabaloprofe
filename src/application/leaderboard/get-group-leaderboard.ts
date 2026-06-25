import { createClient } from '@/infrastructure/supabase/server';
import type { LeaderboardEntry } from '@/domain/types';

/**
 * Get the leaderboard for a group, sorted by totalPoints DESC, joinedAt ASC.
 *
 * Uses the v_group_leaderboard view (PR3 migration 3) which has computed
 * columns for matches_played and perfect_scores. RLS on the underlying
 * tables ensures inactive participants are excluded (the view filters them).
 */
export async function getGroupLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('v_group_leaderboard')
    .select('user_id, username, avatar_url, total_points, position, joined_at, perfect_scores, matches_played')
    .eq('group_id', groupId)
    .order('position', { ascending: true });

  if (error || !data) return [];

  return (data as unknown as Array<Record<string, unknown>>).map((row) => ({
    position: row.position as number,
    userId: row.user_id as string,
    username: row.username as string,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    totalPoints: row.total_points as number,
    matchesPlayed: Number(row.matches_played ?? 0),
    perfectScores: Number(row.perfect_scores ?? 0),
    joinedAt: row.joined_at as string,
  }));
}
