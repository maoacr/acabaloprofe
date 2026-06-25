import { createClient } from '@/infrastructure/supabase/server';
import type { FootballGroup, GroupParticipant } from '@/domain/types';

/**
 * List groups where the current user is an active participant.
 * Returns group info + position + active participant count.
 */
export interface UserGroupListItem extends FootballGroup {
  position: number;
  totalPoints: number;
  activeParticipants: number;
  nextMatch: {
    id: string;
    homeTeamName: string;
    awayTeamName: string;
    scheduledAt: string;
  } | null;
}

export async function listUserGroups(userId: string): Promise<UserGroupListItem[]> {
  const supabase = createClient();

  // 1. Get all active participations for the user
  const { data: participations, error: pErr } = await supabase
    .from('group_participants')
    .select('group_id, position, total_points, joined_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false });

  if (pErr || !participations || participations.length === 0) {
    return [];
  }

  const groupIds = participations.map((p) => p.group_id);

  // 2. Get group details
  const { data: groups, error: gErr } = await supabase
    .from('groups')
    .select('*')
    .in('id', groupIds);

  if (gErr || !groups) return [];

  // 3. Get active participant counts per group
  const { data: counts } = await supabase
    .from('group_participants')
    .select('group_id')
    .in('group_id', groupIds)
    .eq('status', 'active');

  const countByGroup = new Map<string, number>();
  for (const c of counts ?? []) {
    countByGroup.set(c.group_id, (countByGroup.get(c.group_id) ?? 0) + 1);
  }

  // 4. Get next upcoming match per group (simplified: just the earliest scheduled match)
  // For MVP we just pick the earliest 'scheduled' match in the tournament.
  // A more sophisticated version would respect the group's startingPhase.
  const tournamentIds = groups.map((g) => g.tournament_id);
  const { data: nextMatches } = await supabase
    .from('matches')
    .select('id, tournament_id, scheduled_at, home_team_id, away_team_id')
    .in('tournament_id', tournamentIds)
    .eq('status', 'scheduled')
    .gt('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(50);

  // Group next matches by tournament_id
  type NextMatchRow = {
    id: string;
    tournament_id: string;
    scheduled_at: string;
    home_team_id: string;
    away_team_id: string;
  };
  const nextByTournament = new Map<string, NextMatchRow>();
  for (const m of (nextMatches ?? []) as NextMatchRow[]) {
    if (!nextByTournament.has(m.tournament_id)) {
      nextByTournament.set(m.tournament_id, m);
    }
  }

  // 5. Get team names for the next matches
  const nextMatchTeamIds = new Set<string>();
  for (const m of nextByTournament.values()) {
    nextMatchTeamIds.add(m.home_team_id);
    nextMatchTeamIds.add(m.away_team_id);
  }
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .in('id', Array.from(nextMatchTeamIds));

  const teamNameById = new Map<string, string>();
  for (const t of teams ?? []) {
    teamNameById.set(t.id, t.name);
  }

  // 6. Compose the result
  const result: UserGroupListItem[] = [];
  for (const g of groups) {
    const p = participations.find((pp) => pp.group_id === g.id);
    if (!p) continue;
    const nextMatchRow = nextByTournament.get(g.tournament_id);
    const nextMatch = nextMatchRow
      ? {
          id: nextMatchRow.id,
          homeTeamName: teamNameById.get(nextMatchRow.home_team_id) ?? 'TBD',
          awayTeamName: teamNameById.get(nextMatchRow.away_team_id) ?? 'TBD',
          scheduledAt: nextMatchRow.scheduled_at,
        }
      : null;

    result.push({
      ...(g as FootballGroup),
      position: p.position,
      totalPoints: p.total_points,
      activeParticipants: countByGroup.get(g.id) ?? 0,
      nextMatch,
    });
  }

  return result;
}
