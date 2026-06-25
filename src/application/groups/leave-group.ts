import { createClient } from '@/infrastructure/supabase/server';
import type { ActionResult } from '@/domain/types';
import { leaveGroupSchema } from '@/lib/groups/zod-schemas';

/**
 * Leave a group (soft — sets status to 'inactive', preserves data).
 *
 * The admin cannot leave. To transfer admin, contact support (MVP).
 */
export async function leaveGroup(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = leaveGroupSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: 'ID de grupo inválido' };
  }
  const { groupId } = parsed.data;

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'No estás autenticado' };
  }

  // Check the user is not the admin
  const { data: group } = await supabase
    .from('groups')
    .select('admin_user_id')
    .eq('id', groupId)
    .single();

  if (!group) {
    return { ok: false, error: 'Grupo no encontrado' };
  }
  if (group.admin_user_id === user.id) {
    return {
      ok: false,
      error: 'El administrador no puede salir del grupo. Transferí la administración primero.',
    };
  }

  // Soft-leave: set status to inactive
  const { error } = await supabase
    .from('group_participants')
    .update({ status: 'inactive' })
    .eq('group_id', groupId)
    .eq('user_id', user.id);

  if (error) {
    return { ok: false, error: 'No se pudo salir del grupo' };
  }

  return { ok: true, data: undefined };
}
