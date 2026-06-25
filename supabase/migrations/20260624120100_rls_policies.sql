-- =============================================================================
-- Acabalo Profe — Row Level Security Policies
-- Migration: 20260624120100_rls_policies.sql
-- =============================================================================
-- RLS is enabled on every public schema table. The CRITICAL policy is
-- on `predictions` — others' predictions are HIDDEN until is_locked=true
-- AND the viewer is an active participant of the same group.
-- =============================================================================

-- =============================================================================
-- Enable RLS on every table
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- users
-- =============================================================================
-- Any authenticated user can read user profiles (needed for leaderboards,
-- group member lists, etc.). Users can update their own profile (the
-- application layer restricts which fields).
-- The handle_new_user() trigger inserts via SECURITY DEFINER so the
-- initial insert is allowed even though there's no INSERT policy here.

CREATE POLICY "users_select_authenticated"
  ON public.users FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =============================================================================
-- tournaments, phases, teams — public read
-- =============================================================================
-- Anyone (including anon) can read tournament data. This is required
-- so the /unirse/[code] page works for users who haven't logged in yet.

CREATE POLICY "tournaments_select_all"
  ON public.tournaments FOR SELECT
  USING (TRUE);

CREATE POLICY "phases_select_all"
  ON public.phases FOR SELECT
  USING (TRUE);

CREATE POLICY "teams_select_all"
  ON public.teams FOR SELECT
  USING (TRUE);

-- No INSERT/UPDATE/DELETE policies for anon or authenticated users on these
-- tables. Only service role (cron, admin tooling) can write.

-- =============================================================================
-- matches
-- =============================================================================
-- Public read of match data, but live/scheduled results are NOT exposed
-- via RLS column-level filtering (Supabase doesn't support column-level
-- RLS natively). The application layer is responsible for hiding
-- home_goals/away_goals from non-admin users when status is 'scheduled' or 'live'.
-- See src/application/matches/queries.ts.

CREATE POLICY "matches_select_all"
  ON public.matches FOR SELECT
  USING (TRUE);

-- Only system admins can update matches (enter results)
CREATE POLICY "matches_update_admin"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_system_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_system_admin = TRUE
    )
  );

-- =============================================================================
-- groups (pollas)
-- =============================================================================
-- Authenticated users can read groups (needed for /unirse/[code] and for
-- displaying group info to participants).
-- Anon users can ALSO read (to see group info on invite page before login).

CREATE POLICY "groups_select_authenticated"
  ON public.groups FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "groups_select_anon"
  ON public.groups FOR SELECT
  TO anon
  USING (TRUE);

-- Authenticated users can create groups (they become the admin)
CREATE POLICY "groups_insert_authenticated"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (admin_user_id = auth.uid());

-- Only the group's admin can update their group
CREATE POLICY "groups_update_admin"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (admin_user_id = auth.uid())
  WITH CHECK (admin_user_id = auth.uid());

-- NO DELETE policy. Group deletion is support-only.

-- =============================================================================
-- group_participants
-- =============================================================================
-- Users can read their own participation rows (any group).
-- Users can read other participants' rows ONLY if they are themselves
-- a participant of the same group.

CREATE POLICY "gp_select_own"
  ON public.group_participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "gp_select_group_members"
  ON public.group_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_participants gp2
      WHERE gp2.group_id = group_participants.group_id
        AND gp2.user_id = auth.uid()
        AND gp2.status = 'active'
    )
  );

-- Authenticated users can insert their own participation row
-- (joining a group). Application layer checks group capacity and status.
CREATE POLICY "gp_insert_authenticated"
  ON public.group_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only the group's admin can update participant status (activate/deactivate)
CREATE POLICY "gp_update_group_admin"
  ON public.group_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_participants.group_id
        AND g.admin_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_participants.group_id
        AND g.admin_user_id = auth.uid()
    )
  );

-- =============================================================================
-- predictions — CRITICAL RLS POLICY
-- =============================================================================
-- Visibility rules:
--   - Users can ALWAYS see their own predictions.
--   - Users can see OTHER users' predictions ONLY if:
--       a) The prediction is locked (is_locked = TRUE)
--       b) The viewer is an active participant of the same group
--
-- This is the privacy gate. The RLS test in PR5 (tests/integration/prediction-rls.test.ts)
-- proves this with 4 critical scenarios.

CREATE POLICY "predictions_select_policy"
  ON public.predictions FOR SELECT
  TO authenticated
  USING (
    -- Always see your own
    user_id = auth.uid()
    OR
    -- See others' only when locked AND in same active group
    (
      is_locked = TRUE
      AND EXISTS (
        SELECT 1 FROM public.group_participants gp
        WHERE gp.group_id = predictions.group_id
          AND gp.user_id = auth.uid()
          AND gp.status = 'active'
      )
    )
  );

-- Insert: only your own, only if the match is not yet locked (defense in depth)
-- The application layer checks more conditions (active group participation,
-- match in group's startingPhase, etc.), but RLS enforces the lock boundary.
CREATE POLICY "predictions_insert_own"
  ON public.predictions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND m.status = 'scheduled'
        AND m.lock_at > NOW()
    )
    AND EXISTS (
      SELECT 1 FROM public.group_participants gp
      WHERE gp.group_id = predictions.group_id
        AND gp.user_id = auth.uid()
        AND gp.status = 'active'
    )
  );

-- Update: only your own, only if NOT yet locked
CREATE POLICY "predictions_update_own_unlocked"
  ON public.predictions FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND is_locked = FALSE
  )
  WITH CHECK (
    user_id = auth.uid()
    AND is_locked = FALSE
  );

-- =============================================================================
-- End of migration
-- =============================================================================
