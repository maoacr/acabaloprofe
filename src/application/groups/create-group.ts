'use server';

import { createClient } from '@/infrastructure/supabase/server';
import { createServiceRoleClient } from '@/infrastructure/supabase/service-role';
import type { ActionResult } from '@/domain/types';
import { createGroupSchema, type CreateGroupInput } from '@/lib/groups/zod-schemas';

/**
 * Create a new group.
 *
 * Flow:
 *  1. Validate input with Zod
 *  2. Verify tournament exists and is active/upcoming (use service role
 *     to bypass RLS — anon reads of tournaments table are allowed but
 *     we need to check the status field, which the application layer
 *     wants to verify before allowing a group)
 *  3. Generate unique short code via RPC
 *  4. Insert group with current user as admin
 *  5. Add admin as the first participant
 */
export async function createGroup(
  rawInput: unknown,
): Promise<ActionResult<{ groupId: string; shortCode: string }>> {
  const parsed = createGroupSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first.message, field: first.path[0]?.toString() };
  }
  const input: CreateGroupInput = parsed.data;

  const supabase = createClient();

  // 1. Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'No estás autenticado' };
  }

  // 2. Verify tournament exists and is joinable
  // Use the user's RLS client (public read of tournaments is allowed).
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('id, status')
    .eq('id', input.tournamentId)
    .single();

  if (tErr || !tournament) {
    return { ok: false, error: 'Torneo no encontrado', field: 'tournamentId' };
  }
  if (tournament.status === 'finished') {
    return { ok: false, error: 'No se pueden crear grupos para torneos finalizados', field: 'tournamentId' };
  }

  // 3. Generate unique short code via service-role RPC
  const service = createServiceRoleClient();
  const { data: shortCodeData, error: scErr } = await service.rpc('generate_group_short_code');
  if (scErr || !shortCodeData) {
    return { ok: false, error: 'No se pudo generar el código del grupo' };
  }
  const shortCode = shortCodeData as string;

  // 4. Insert group
  const { data: group, error: gErr } = await supabase
    .from('groups')
    .insert({
      short_code: shortCode,
      name: input.name,
      description: input.description || null,
      special_conditions: input.specialConditions || null,
      tournament_id: input.tournamentId,
      starting_phase: input.startingPhase,
      admin_user_id: user.id,
      max_participants: input.maxParticipants,
    })
    .select('id, short_code')
    .single();

  if (gErr || !group) {
    if (gErr?.code === '23505') {
      return { ok: false, error: 'El código del grupo ya existe, intentá de nuevo' };
    }
    return { ok: false, error: gErr?.message ?? 'No se pudo crear el grupo' };
  }

  // 5. Add admin as first participant
  const { error: gpErr } = await supabase.from('group_participants').insert({
    group_id: group.id,
    user_id: user.id,
    status: 'active',
  });

  if (gpErr) {
    return { ok: false, error: 'Grupo creado pero no se pudo agregar al admin' };
  }

  return { ok: true, data: { groupId: group.id, shortCode: group.short_code } };
}
