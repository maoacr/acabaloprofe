import { createClient } from '@/infrastructure/supabase/server';
import { createServiceRoleClient } from '@/infrastructure/supabase/service-role';
import type { ActionResult } from '@/domain/types';
import { joinGroupSchema } from '@/lib/groups/zod-schemas';

/**
 * Join a group via its short code.
 *
 * Handles 4 cases:
 *  - New join: INSERT new group_participants row
 *  - Rejoin: was inactive, set back to active (preserving original joined_at)
 *  - Already active: return early with friendly message
 *  - Group full or inactive: rejected
 */
export async function joinGroup(
  rawInput: unknown,
): Promise<ActionResult<{ groupId: string }>> {
  const parsed = joinGroupSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first.message, field: first.path[0]?.toString() };
  }
  const { shortCode } = parsed.data;

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'No estás autenticado' };
  }

  // Look up the group by short code via the anon-safe RPC
  const { data: invite, error: invErr } = await supabase.rpc('get_group_for_invite', {
    p_short_code: shortCode,
  });

  if (invErr || !invite || invite.length === 0) {
    return { ok: false, error: 'Código inválido o grupo no encontrado' };
  }

  const group = invite[0] as {
    group_id: string;
    max_participants: number;
    active_participants: number | string; // bigint from RPC may come as string
  };
  const groupId = group.group_id;
  const activeCount = typeof group.active_participants === 'string'
    ? parseInt(group.active_participants, 10)
    : group.active_participants;

  // Check if user is already a participant
  // We need to check both active and inactive. Use the user's RLS context
  // (they can see their own participation row).
  const { data: existing } = await supabase
    .from('group_participants')
    .select('id, status, joined_at')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'active') {
      return { ok: true, data: { groupId } }; // idempotent
    }
    // Reactivate (preserve original joined_at)
    const { error: updErr } = await supabase
      .from('group_participants')
      .update({ status: 'active' })
      .eq('id', existing.id);

    if (updErr) {
      return { ok: false, error: 'No se pudo reactivar la participación' };
    }
    return { ok: true, data: { groupId } };
  }

  // Check capacity. Subtract 1 if current user is the admin (already in the group).
  if (activeCount >= group.max_participants) {
    return { ok: false, error: 'Este grupo está completo' };
  }

  // New join
  const { error: insErr } = await supabase.from('group_participants').insert({
    group_id: groupId,
    user_id: user.id,
    status: 'active',
  });

  if (insErr) {
    if (insErr.code === '23505') {
      return { ok: true, data: { groupId } }; // race condition, treat as success
    }
    return { ok: false, error: insErr.message };
  }

  return { ok: true, data: { groupId } };
}
