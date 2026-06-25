import { createClient } from '@/infrastructure/supabase/server';
import type { ActionResult } from '@/domain/types';
import { isMatchOpen } from '@/domain/lock';
import { submitPredictionSchema, type SubmitPredictionInput } from '@/lib/predictions/zod-schemas';

/**
 * Submit or update a prediction.
 *
 * Flow:
 *  1. Validate input with Zod
 *  2. Verify user is active participant of the group
 *  3. Verify match is in the group's startingPhase window
 *  4. Verify match is not past lock_at (defense in depth — RLS also enforces)
 *  5. UPSERT into predictions
 *
 * RLS will block this insert/update if any precondition is violated.
 */
export async function submitPrediction(
  rawInput: unknown,
): Promise<ActionResult<{ predictionId: string }>> {
  const parsed = submitPredictionSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first.message, field: first.path[0]?.toString() };
  }
  const input: SubmitPredictionInput = parsed.data;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'No estás autenticado' };
  }

  // 2. Verify participation
  const { data: participation } = await supabase
    .from('group_participants')
    .select('id, status')
    .eq('group_id', input.groupId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!participation) {
    return { ok: false, error: 'No sos participante activo de este grupo' };
  }

  // 3. Verify group + match
  const { data: group } = await supabase
    .from('groups')
    .select('tournament_id, starting_phase')
    .eq('id', input.groupId)
    .single();

  if (!group) {
    return { ok: false, error: 'Grupo no encontrado' };
  }

  const { data: match } = await supabase
    .from('matches')
    .select('id, phase_id, scheduled_at, lock_at, status, is_knockout, phases!inner(tournament_id, order_index, type)')
    .eq('id', input.matchId)
    .single();

  if (!match) {
    return { ok: false, error: 'Partido no encontrado' };
  }

  // 4. Defense-in-depth lock check (RLS also enforces this)
  if (!isMatchOpen(match.status as 'scheduled', match.lock_at)) {
    return { ok: false, error: 'El plazo de pronóstico cerró' };
  }

  // 5. Verify match is in the group's startingPhase window
  const phaseOrder = (match as unknown as { phases: { order_index: number; type: string } }).phases.order_index;
  const phaseType = (match as unknown as { phases: { type: string } }).phases.type;

  const inPhaseWindow = (() => {
    switch (group.starting_phase) {
      case 'ALL':
        return true;
      case 'FROM_ROUND_OF_16':
        return phaseOrder >= 2; // skip group_stage
      case 'FROM_SEMIFINALS':
        return phaseOrder >= 4; // SF
      case 'FINAL_ONLY':
        return phaseOrder >= 5; // 3rd + final
      default:
        return false;
    }
  })();

  if (!inPhaseWindow) {
    return { ok: false, error: 'Este partido no está incluido en la fase de tu grupo' };
  }

  // 6. UPSERT (insert or update on conflict)
  const { data, error } = await supabase
    .from('predictions')
    .upsert(
      {
        user_id: user.id,
        match_id: input.matchId,
        group_id: input.groupId,
        home_goals_predicted: input.homeGoals,
        away_goals_predicted: input.awayGoals,
        // is_locked stays whatever it was (RLS blocks update when true)
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,match_id,group_id',
      },
    )
    .select('id')
    .single();

  if (error || !data) {
    if (error?.code === '42501' /* RLS violation */) {
      return { ok: false, error: 'No tenés permisos para pronosticar este partido' };
    }
    return { ok: false, error: error?.message ?? 'No se pudo guardar el pronóstico' };
  }

  return { ok: true, data: { predictionId: data.id } };
}
