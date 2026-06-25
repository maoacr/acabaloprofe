import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/infrastructure/env';
import { calculatePoints } from '@/domain/scoring';

/**
 * Scoring integration test — runs against a real Supabase.
 *
 * Verifies that:
 *  1. Entering a result triggers the recalculate_match_points RPC
 *  2. Predictions are updated with correct point breakdown
 *  3. Leaderboard positions are recalculated
 *  4. Cancelling a match zeros out predictions
 *
 * SKIPS if the DB is unreachable.
 */

const serviceClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let skipped = false;
let userA: { id: string };
let userB: { id: string };
let groupId: string;
let matchId: string;

async function setup() {
  const ts = Date.now();

  // Create 2 users
  const { data: uA } = await serviceClient.auth.admin.createUser({
    email: `scoring-a-${ts}@test.local`, password: 'TestPass123', email_confirm: true,
  });
  const { data: uB } = await serviceClient.auth.admin.createUser({
    email: `scoring-b-${ts}@test.local`, password: 'TestPass123', email_confirm: true,
  });
  if (!uA.user || !uB.user) throw new Error('user creation');
  userA = { id: uA.user.id };
  userB = { id: uB.user.id };

  await serviceClient.from('users').insert([
    { id: uA.user.id, username: `scoringa_${ts}`, email: `scoring-a-${ts}@test.local`, first_name: 'A', last_name: 'T', country: 'Argentina', city: 'BA', timezone: 'UTC' },
    { id: uB.user.id, username: `scoringb_${ts}`, email: `scoring-b-${ts}@test.local`, first_name: 'B', last_name: 'T', country: 'Argentina', city: 'BA', timezone: 'UTC' },
  ]);

  const { data: t } = await serviceClient.from('tournaments').select('id').eq('slug', 'mundial-demo-2026').single();
  if (!t) throw new Error('tournament');
  const { data: p } = await serviceClient.from('phases').select('id').limit(1).single();
  if (!p) throw new Error('phase');

  // Group
  const { data: g } = await serviceClient.from('groups').insert({
    short_code: `SC${(ts % 100000).toString(36).toUpperCase().padStart(4, '0')}`.slice(0, 6),
    name: `Scoring test ${ts}`,
    tournament_id: t.id,
    starting_phase: 'ALL',
    admin_user_id: uA.user.id,
    max_participants: 10,
  }).select('id').single();
  if (!g) throw new Error('group');
  groupId = g.id;

  await serviceClient.from('group_participants').insert([
    { group_id: groupId, user_id: uA.user.id, status: 'active' },
    { group_id: groupId, user_id: uB.user.id, status: 'active' },
  ]);

  // Match (in the past so we can enter result without lock issues)
  const { data: m } = await serviceClient.from('matches').insert({
    tournament_id: t.id,
    phase_id: p.id,
    home_team_id: '20000000-0000-0000-0000-000000000001',
    away_team_id: '20000000-0000-0000-0000-000000000002',
    scheduled_at: new Date(Date.now() - 86400000).toISOString(),
    is_knockout: false,
    matchday: 'scoring test',
  }).select('id').single();
  if (!m) throw new Error('match');
  matchId = m.id;
}

async function teardown() {
  if (!matchId) return;
  await serviceClient.from('predictions').delete().eq('match_id', matchId);
  await serviceClient.from('group_participants').delete().eq('group_id', groupId);
  await serviceClient.from('groups').delete().eq('id', groupId);
  await serviceClient.from('matches').delete().eq('id', matchId);
  await serviceClient.from('users').delete().in('id', [userA.id, userB.id]);
  if (userA) await serviceClient.auth.admin.deleteUser(userA.id);
  if (userB) await serviceClient.auth.admin.deleteUser(userB.id);
}

describe('scoring end-to-end via RPC', () => {
  beforeAll(async () => {
    const { error } = await serviceClient.from('tournaments').select('id').limit(1);
    if (error) {
      skipped = true;
      console.warn('[scoring] skipping:', error.message);
      return;
    }
    await setup();
  }, 30_000);

  afterAll(async () => {
    if (!skipped) await teardown();
  });

  it('enters result and updates predictions via RPC', async () => {
    if (skipped) return;

    // User A predicts 2:1 (correct winner + correct home + correct diff)
    // User B predicts 1:2 (wrong winner, wrong everything)
    await serviceClient.from('predictions').insert([
      { user_id: userA.id, match_id: matchId, group_id: groupId, home_goals_predicted: 2, away_goals_predicted: 1 },
      { user_id: userB.id, match_id: matchId, group_id: groupId, home_goals_predicted: 1, away_goals_predicted: 2 },
    ]);

    // Result: 2:1 → A gets 5+2+2+1=10 (pleno), B gets 0
    await serviceClient.from('matches').update({
      status: 'finished', home_goals: 2, away_goals: 1,
    }).eq('id', matchId);

    const { data: rpcData, error: rpcErr } = await serviceClient.rpc('recalculate_match_points', {
      p_match_id: matchId,
    });
    expect(rpcErr).toBeNull();
    expect(rpcData).toBe(2);

    const { data: preds } = await serviceClient
      .from('predictions')
      .select('user_id, total_points, winner_points, home_goals_points, away_goals_points, diff_points')
      .eq('match_id', matchId);

    const a = preds?.find((p) => p.user_id === userA.id);
    const b = preds?.find((p) => p.user_id === userB.id);
    expect(a?.total_points).toBe(10);
    expect(b?.total_points).toBe(0);

    // Leaderboard should be recalculated
    const { data: lb } = await serviceClient
      .from('v_group_leaderboard')
      .select('user_id, total_points, position')
      .eq('group_id', groupId)
      .order('position');

    expect(lb).toHaveLength(2);
    expect(lb?.[0]?.user_id).toBe(userA.id);
    expect(lb?.[0]?.position).toBe(1);
    expect(lb?.[1]?.user_id).toBe(userB.id);
    expect(lb?.[1]?.position).toBe(2);
  });

  it('cancelling a match zeros out all predictions', async () => {
    if (skipped) return;

    await serviceClient.from('matches').update({ status: 'cancelled' }).eq('id', matchId);
    await serviceClient.rpc('recalculate_match_points', { p_match_id: matchId });

    const { data: preds } = await serviceClient
      .from('predictions')
      .select('total_points')
      .eq('match_id', matchId);

    for (const p of preds ?? []) {
      expect(p.total_points).toBe(0);
    }
  });

  it('knockout matches score double', () => {
    // Pure unit check (no DB)
    const group = calculatePoints({ home: 1, away: 0 }, { home: 1, away: 0 }, false);
    const knockout = calculatePoints({ home: 1, away: 0 }, { home: 1, away: 0 }, true);
    expect(group.totalPoints).toBe(10);
    expect(knockout.totalPoints).toBe(20);
  });
});
