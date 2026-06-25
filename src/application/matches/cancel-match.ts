import { createClient } from '@/infrastructure/supabase/server';
import type { ActionResult } from '@/domain/types';
import { cancelMatchSchema } from '@/lib/matches/zod-schemas';

/**
 * Cancel a match. System admin only.
 *
 * The recalculate_match_points() RPC handles the side effect:
 * sets all predictions' total_points = 0 and recalculates leaderboards.
 */
export async function cancelMatch(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = cancelMatchSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: 'Partido inválido' };
  }
  const { matchId } = parsed.data;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'No estás autenticado' };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('is_system_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_system_admin) {
    return { ok: false, error: 'No tenés permisos para esta acción' };
  }

  const { error } = await supabase
    .from('matches')
    .update({ status: 'cancelled' })
    .eq('id', matchId);

  if (error) {
    return { ok: false, error: 'No se pudo cancelar el partido' };
  }

  // Recalculate: the RPC zeroes out all predictions for this match
  // and recalculates leaderboards.
  await supabase.rpc('recalculate_match_points', { p_match_id: matchId });

  return { ok: true, data: undefined };
}
