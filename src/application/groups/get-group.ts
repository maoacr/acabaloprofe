import { createClient } from '@/infrastructure/supabase/server';
import type { FootballGroup, GroupParticipant } from '@/domain/types';

export interface GroupDetail extends FootballGroup {
  participants: (GroupParticipant & { username: string; avatarUrl: string | null })[];
  isCurrentUserAdmin: boolean;
  isCurrentUserMember: boolean;
  activeParticipantsCount: number;
}

/**
 * Get a single group by id, with all its participants and current-user
 * relationship flags.
 */
export async function getGroup(
  groupId: string,
  currentUserId: string,
): Promise<GroupDetail | null> {
  const supabase = createClient();

  const { data: group, error: gErr } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (gErr || !group) return null;

  // Get all participants with user info
  const { data: participants } = await supabase
    .from('group_participants')
    .select('id, group_id, user_id, status, total_points, position, joined_at, users!inner(username, avatar_url)')
    .eq('group_id', groupId)
    .order('position', { ascending: true });

  const flat = (participants ?? []).map((p) => {
    const u = (p as unknown as { users: { username: string; avatar_url: string | null } }).users;
    return {
      id: p.id,
      groupId: p.group_id,
      userId: p.user_id,
      status: p.status as 'active' | 'inactive',
      totalPoints: p.total_points,
      position: p.position,
      joinedAt: p.joined_at,
      username: u.username,
      avatarUrl: u.avatar_url,
    };
  });

  const me = flat.find((p) => p.userId === currentUserId);
  const activeCount = flat.filter((p) => p.status === 'active').length;

  return {
    ...(group as FootballGroup),
    participants: flat,
    isCurrentUserAdmin: group.admin_user_id === currentUserId,
    isCurrentUserMember: me?.status === 'active',
    activeParticipantsCount: activeCount,
  };
}
