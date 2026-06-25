import { createClient } from '@/infrastructure/supabase/server';
import type { ActionResult } from '@/domain/types';
import { manageParticipantSchema } from '@/lib/groups/zod-schemas';

/**
 * Activate or deactivate a participant. Only the group admin can do this.
 * RLS enforces the admin check; this action just adds a friendly error
 * message if the update fails.
 */
export async function manageParticipant(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = manageParticipantSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: 'Datos inválidos' };
  }
  const { groupId, userId, status } = parsed.data;

  const supabase = createClient();

  // Admin can't deactivate themselves
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'No estás autenticado' };
  }
  if (userId === user.id) {
    return { ok: false, error: 'No podés cambiar tu propio estado' };
  }

  const { error } = await supabase
    .from('group_participants')
    .update({ status })
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    // RLS will block non-admins; surface a generic message
    return { ok: false, error: 'No tenés permisos para realizar esta acción' };
  }

  return { ok: true, data: undefined };
}
