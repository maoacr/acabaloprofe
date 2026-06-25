import { createClient } from '@/infrastructure/supabase/server';
import type { ActionResult } from '@/domain/types';
import { enterMatchResultSchema, type EnterMatchResultInput } from '@/lib/matches/zod-schemas';

/**
 * Enter (or update) a match result. System admin only.
 *
 * Flow:
 *  1. Validate input
 *  2. Verify caller is system admin
 *  3. Verify match is not cancelled
 *  4. UPDATE match: status='finished', home_goals, away_goals
 *  5. Call recalculate_match_points() RPC (updates predictions + leaderboards)
 *  6. Return count of updated predictions
 */
export async function enterMatchResult(
  rawInput: unknown,
): Promise<ActionResult<{ updatedPredictions: number }>> {
  const parsed = enterMatchResultSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first.message, field: first.path[0]?.toString() };
  }
  const input: EnterMatchResultInput = parsed.data;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'No estás autenticado' };
  }

  // 2. Verify admin
  const { data: profile } = await supabase
    .from('users')
    .select('is_system_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_system_admin) {
    return { ok: false, error: 'No tenés permisos para esta acción' };
  }

  // 3. Verify match state
  const { data: match } = await supabase
    .from('matches')
    .select('status')
    .eq('id', input.matchId)
    .single();
  if (!match) {
    return { ok: false, error: 'Partido no encontrado' };
  }
  if (match.status === 'cancelled') {
    return { ok: false, error: 'No se puede ingresar resultado a un partido cancelado' };
  }

  // 4. Update match
  const { error: uErr } = await supabase
    .from('matches')
    .update({
      status: 'finished',
      home_goals: input.homeGoals,
      away_goals: input.awayGoals,
    })
    .eq('id', input.matchId);

  if (uErr) {
    return { ok: false, error: 'No se pudo actualizar el partido' };
  }

  // 5. Recalculate points via RPC (service-role, but user-context works for
  // this since it's SECURITY DEFINER)
  const { data: rpcData, error: rpcErr } = await supabase.rpc('recalculate_match_points', {
    p_match_id: input.matchId,
  });

  if (rpcErr) {
    return { ok: false, error: 'No se pudo recalcular los puntos' };
  }

  const updated = typeof rpcData === 'number' ? rpcData : 0;
  return { ok: true, data: { updatedPredictions: updated } };
}
