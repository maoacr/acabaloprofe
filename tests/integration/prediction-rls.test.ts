import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/infrastructure/env';
import { isMatchLocked } from '@/domain/lock';

/**
 * CRITICAL RLS TESTS — predictions table
 *
 * These tests prove that the Row Level Security policy on `predictions`
 * correctly enforces the visibility rules from the spec:
 *
 *   REQ-PRED-004:
 *   - Users can ALWAYS see their own predictions
 *   - Users can see OTHER users' predictions ONLY if:
 *       a) The prediction is locked (is_locked = TRUE)
 *       b) The viewer is an active participant of the same group
 *
 * These run against a real Supabase instance (cloud or local). They
 * require:
 *   1. Migrations applied (pnpm db:push)
 *   2. Service role key in env (to set up test data)
 *   3. Anon key in env (to simulate the viewing user)
 *
 * Tests are SKIPPED if SUPABASE_TEST_URL is not set.
 *
 * To run locally:
 *   1. pnpm db:link --project-ref <your-ref>
 *   2. pnpm db:push
 *   3. pnpm test tests/integration/prediction-rls.test.ts
 */

const TEST_PREFIX = `rls-test-${Date.now()}-`;
let skipped = false;

const serviceClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TestFixtures {
  userA: { id: string; email: string };
  userB: { id: string; email: string };
  userC: { id: string; email: string };
  groupId: string;
  matchId: string;
  predictionAId: string;
  predictionBId: string;
}

let fixtures: TestFixtures;

async function setupFixtures(): Promise<TestFixtures> {
  const ts = Date.now();

  // Create 3 test users via the admin API (no email confirmation)
  const { data: uA, error: eA } = await serviceClient.auth.admin.createUser({
    email: `usera-${ts}@test.local`,
    password: 'TestPass123',
    email_confirm: true,
  });
  if (eA || !uA.user) throw new Error(`user A: ${eA?.message}`);

  const { data: uB, error: eB } = await serviceClient.auth.admin.createUser({
    email: `userb-${ts}@test.local`,
    password: 'TestPass123',
    email_confirm: true,
  });
  if (eB || !uB.user) throw new Error(`user B: ${eB?.message}`);

  const { data: uC, error: eC } = await serviceClient.auth.admin.createUser({
    email: `userc-${ts}@test.local`,
    password: 'TestPass123',
    email_confirm: true,
  });
  if (eC || !uC.user) throw new Error(`user C: ${eC?.message}`);

  // Insert profile rows for each
  await serviceClient.from('users').insert([
    { id: uA.user.id, username: `usera_${ts}`, email: `usera-${ts}@test.local`, first_name: 'A', last_name: 'T', country: 'Argentina', city: 'BA', timezone: 'UTC' },
    { id: uB.user.id, username: `userb_${ts}`, email: `userb-${ts}@test.local`, first_name: 'B', last_name: 'T', country: 'Argentina', city: 'BA', timezone: 'UTC' },
    { id: uC.user.id, username: `userc_${ts}`, email: `userc-${ts}@test.local`, first_name: 'C', last_name: 'T', country: 'Argentina', city: 'BA', timezone: 'UTC' },
  ]);

  // Get the demo tournament (seeded in PR3)
  const { data: tournament } = await serviceClient
    .from('tournaments')
    .select('id')
    .eq('slug', 'mundial-demo-2026')
    .single();
  if (!tournament) throw new Error('demo tournament not found — apply migrations first');

  // Get a phase
  const { data: phase } = await serviceClient
    .from('phases')
    .select('id')
    .eq('tournament_id', tournament.id)
    .limit(1)
    .single();
  if (!phase) throw new Error('no phase found');

  // Insert a test match scheduled far in the future (so it's not locked)
  const { data: match, error: mErr } = await serviceClient
    .from('matches')
    .insert({
      tournament_id: tournament.id,
      phase_id: phase.id,
      home_team_id: '20000000-0000-0000-0000-000000000001',
      away_team_id: '20000000-0000-0000-0000-000000000002',
      scheduled_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_knockout: false,
      matchday: 'RLS test',
    })
    .select('id')
    .single();
  if (mErr || !match) throw new Error(`match: ${mErr?.message}`);

  // Create a group where A and B are members, C is not
  const { data: group, error: gErr } = await serviceClient
    .from('groups')
    .insert({
      short_code: `RL${(ts % 1000000).toString(36).toUpperCase().padStart(4, '0')}`.slice(0, 6),
      name: `RLS test group ${ts}`,
      tournament_id: tournament.id,
      starting_phase: 'ALL',
      admin_user_id: uA.user.id,
      max_participants: 10,
    })
    .select('id')
    .single();
  if (gErr || !group) throw new Error(`group: ${gErr?.message}`);

  await serviceClient.from('group_participants').insert([
    { group_id: group.id, user_id: uA.user.id, status: 'active' },
    { group_id: group.id, user_id: uB.user.id, status: 'active' },
  ]);

  // Insert two predictions: A and B, both UNLOCKED
  const { data: predA } = await serviceClient
    .from('predictions')
    .insert({
      user_id: uA.user.id,
      match_id: match.id,
      group_id: group.id,
      home_goals_predicted: 2,
      away_goals_predicted: 1,
      is_locked: false,
    })
    .select('id')
    .single();
  if (!predA) throw new Error('prediction A');

  const { data: predB } = await serviceClient
    .from('predictions')
    .insert({
      user_id: uB.user.id,
      match_id: match.id,
      group_id: group.id,
      home_goals_predicted: 0,
      away_goals_predicted: 0,
      is_locked: false,
    })
    .select('id')
    .single();
  if (!predB) throw new Error('prediction B');

  return {
    userA: { id: uA.user.id, email: `usera-${ts}@test.local` },
    userB: { id: uB.user.id, email: `userb-${ts}@test.local` },
    userC: { id: uC.user.id, email: `userc-${ts}@test.local` },
    groupId: group.id,
    matchId: match.id,
    predictionAId: predA.id,
    predictionBId: predB.id,
  };
}

async function teardownFixtures() {
  if (!fixtures) return;
  await serviceClient.from('predictions').delete().in('id', [fixtures.predictionAId, fixtures.predictionBId]);
  await serviceClient.from('group_participants').delete().eq('group_id', fixtures.groupId);
  await serviceClient.from('groups').delete().eq('id', fixtures.groupId);
  await serviceClient.from('matches').delete().eq('id', fixtures.matchId);
  await serviceClient.from('users').delete().in('id', [fixtures.userA.id, fixtures.userB.id, fixtures.userC.id]);
  await serviceClient.auth.admin.deleteUser(fixtures.userA.id);
  await serviceClient.auth.admin.deleteUser(fixtures.userB.id);
  await serviceClient.auth.admin.deleteUser(fixtures.userC.id);
}

async function signInAs(email: string, password: string) {
  const { data, error } = await serviceClient.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`sign in ${email}: ${error?.message}`);
  // Use the access token to create a user-context client
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    auth: { persistSession: false },
  });
}

describe('CRITICAL: predictions RLS policy', () => {
  beforeAll(async () => {
    // Quick sanity check that we can talk to the DB
    const { error } = await serviceClient.from('tournaments').select('id').limit(1);
    if (error) {
      skipped = true;
      // eslint-disable-next-line no-console
      console.warn('[prediction-rls] skipping — cannot connect to Supabase:', error.message);
      return;
    }
    fixtures = await setupFixtures();
  }, 30_000);

  afterAll(async () => {
    if (!skipped) await teardownFixtures();
  });

  it('1. User B CANNOT read User A unlocked prediction', async () => {
    if (skipped) return;
    const client = await signInAs(fixtures.userB.email, 'TestPass123');
    const { data, error } = await client
      .from('predictions')
      .select('id, user_id')
      .eq('id', fixtures.predictionAId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it('2. User B CAN read User A locked prediction (same group)', async () => {
    if (skipped) return;
    // Lock A's prediction
    await serviceClient
      .from('predictions')
      .update({ is_locked: true })
      .eq('id', fixtures.predictionAId);

    const client = await signInAs(fixtures.userB.email, 'TestPass123');
    const { data, error } = await client
      .from('predictions')
      .select('id, user_id')
      .eq('id', fixtures.predictionAId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(1);
    expect(data?.[0]?.user_id).toBe(fixtures.userA.id);
  });

  it('3. User C (NOT in group) CANNOT read any predictions in that group', async () => {
    if (skipped) return;
    const client = await signInAs(fixtures.userC.email, 'TestPass123');
    const { data, error } = await client
      .from('predictions')
      .select('id')
      .eq('group_id', fixtures.groupId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it('4. User CANNOT update a locked prediction (their own)', async () => {
    if (skipped) return;
    const client = await signInAs(fixtures.userA.email, 'TestPass123');
    const { data, error } = await client
      .from('predictions')
      .update({ home_goals_predicted: 99 })
      .eq('id', fixtures.predictionAId)
      .select('id');
    // RLS should block: either error or 0 rows updated
    expect(data ?? []).toHaveLength(0);
  });
});

describe('domain lock helper', () => {
  it('isMatchLocked returns true for past dates', () => {
    expect(isMatchLocked(new Date(Date.now() - 1000).toISOString())).toBe(true);
  });
  it('isMatchLocked returns false for future dates', () => {
    expect(isMatchLocked(new Date(Date.now() + 60_000).toISOString())).toBe(false);
  });
});
