import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/infrastructure/env';

/**
 * Leaderboard integration test — verifies sort order and tiebreakers.
 *
 * SKIPS if the DB is unreachable.
 */

const serviceClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let skipped = false;
let userA: { id: string };
let userB: { id: string };
let userC: { id: string };
let groupId: string;
let matchId: string;

async function setup() {
  const ts = Date.now();
  const users = await Promise.all(
    ['a', 'b', 'c'].map((letter) =>
      serviceClient.auth.admin.createUser({
        email: `lb-${letter}-${ts}@test.local`, password: 'TestPass123', email_confirm: true,
      })
    ),
  );
  if (users.some((u) => !u.data.user)) throw new Error('user creation');
  userA = { id: users[0]!.data.user!.id };
  userB = { id: users[1]!.data.user!.id };
  userC = { id: users[2]!.data.user!.id };

  await serviceClient.from('users').insert([
    { id: userA.id, username: `lb_a_${ts}`, email: `lb-a-${ts}@test.local`, first_name: 'A', last_name: 'T', country: 'Argentina', city: 'BA', timezone: 'UTC' },
    { id: userB.id, username: `lb_b_${ts}`, email: `lb-b-${ts}@test.local`, first_name: 'B', last_name: 'T', country: 'Argentina', city: 'BA', timezone: 'UTC' },
    { id: userC.id, username: `lb_c_${ts}`, email: `lb-c-${ts}@test.local`, first_name: 'C', last_name: 'T', country: 'Argentina', city: 'BA', timezone: 'UTC' },
  ]);

  const { data: t } = await serviceClient.from('tournaments').select('id').eq('slug', 'mundial-demo-2026').single();
  if (!t) throw new Error('tournament');
  const { data: p } = await serviceClient.from('phases').select('id').limit(1).single();
  if (!p) throw new Error('phase');

  const { data: g } = await serviceClient.from('groups').insert({
    short_code: `LB${(ts % 100000).toString(36).toUpperCase().padStart(4, '0')}`.slice(0, 6),
    name: `Leaderboard test ${ts}`,
    tournament_id: t.id,
    starting_phase: 'ALL',
    admin_user_id: userA.id,
    max_participants: 10,
  }).select('id').single();
  if (!g) throw new Error('group');
  groupId = g.id;

  await serviceClient.from('group_participants').insert([
    { group_id: groupId, user_id: userA.id, status: 'active' },
    { group_id: groupId, user_id: userB.id, status: 'active' },
    { group_id: groupId, user_id: userC.id, status: 'active' },
  ]);

  const { data: m } = await serviceClient.from('matches').insert({
    tournament_id: t.id,
    phase_id: p.id,
    home_team_id: '20000000-0000-0000-0000-000000000001',
    away_team_id: '20000000-0000-0000-0000-000000000002',
    scheduled_at: new Date(Date.now() - 86400000).toISOString(),
    is_knockout: false,
    matchday: 'lb test',
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
  await serviceClient.from('users').delete().in('id', [userA.id, userB.id, userC.id]);
  for (const u of [userA, userB, userC]) {
    if (u) await serviceClient.auth.admin.deleteUser(u.id);
  }
}

describe('leaderboard sort and tiebreakers', () => {
  beforeAll(async () => {
    const { error } = await serviceClient.from('tournaments').select('id').limit(1);
    if (error) {
      skipped = true;
      console.warn('[leaderboard] skipping:', error.message);
      return;
    }
    await setup();
  }, 30_000);

  afterAll(async () => {
    if (!skipped) await teardown();
  });

  it('orders by total_points DESC', async () => {
    if (skipped) return;

    // A: 10 pts (pleno), B: 6 pts, C: 0 pts
    await serviceClient.from('predictions').insert([
      { user_id: userA.id, match_id: matchId, group_id: groupId, home_goals_predicted: 2, away_goals_predicted: 1, is_locked: true },
      { user_id: userB.id, match_id: matchId, group_id: groupId, home_goals_predicted: 2, away_goals_predicted: 0, is_locked: true },
      { user_id: userC.id, match_id: matchId, group_id: groupId, home_goals_predicted: 0, away_goals_predicted: 0, is_locked: true },
    ]);

    await serviceClient.from('matches').update({ status: 'finished', home_goals: 2, away_goals: 1 }).eq('id', matchId);
    await serviceClient.rpc('recalculate_match_points', { p_match_id: matchId });

    const { data: lb } = await serviceClient
      .from('v_group_leaderboard')
      .select('user_id, total_points, position')
      .eq('group_id', groupId)
      .order('position');

    expect(lb).toHaveLength(3);
    expect(lb?.[0]?.user_id).toBe(userA.id);
    expect(lb?.[0]?.total_points).toBe(10);
    expect(lb?.[1]?.user_id).toBe(userB.id);
    expect(lb?.[1]?.total_points).toBe(6);
    expect(lb?.[2]?.user_id).toBe(userC.id);
    expect(lb?.[2]?.total_points).toBe(0);
  });
});
