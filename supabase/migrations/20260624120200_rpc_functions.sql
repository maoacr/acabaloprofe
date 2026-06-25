-- =============================================================================
-- Acabalo Profe — RPC Functions and Views
-- Migration: 20260624120200_rpc_functions.sql
-- =============================================================================
-- All scoring, leaderboard, short-code, and invite logic is centralized
-- in SQL functions. The application calls these via RPC.
-- =============================================================================

-- =============================================================================
-- lock_pending_predictions
-- =============================================================================
-- Called by the cron job (Edge Function) every 5 minutes.
-- Sets is_locked = TRUE on all predictions for matches whose lock_at
-- has passed and that are still in 'scheduled' status.
-- Returns the count of predictions locked (for logging).

CREATE OR REPLACE FUNCTION public.lock_pending_predictions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked_count INTEGER;
BEGIN
  WITH locked AS (
    UPDATE public.predictions p
    SET is_locked = TRUE
    FROM public.matches m
    WHERE p.match_id = m.id
      AND m.lock_at <= NOW()
      AND m.status = 'scheduled'
      AND p.is_locked = FALSE
    RETURNING p.id
  )
  SELECT COUNT(*) INTO v_locked_count FROM locked;

  RETURN v_locked_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lock_pending_predictions() TO service_role;

-- =============================================================================
-- recalculate_match_points
-- =============================================================================
-- Called when a match result is entered (admin action) or changed.
-- Recalculates all predictions for the given match using the same
-- scoring rules as src/domain/scoring.ts.
-- After updating predictions, recalculates the leaderboard for each
-- affected group.
--
-- If the match is cancelled, all predictions get 0 points.

CREATE OR REPLACE FUNCTION public.recalculate_match_points(p_match_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_pred RECORD;
  v_winner_points INTEGER;
  v_home_pts INTEGER;
  v_away_pts INTEGER;
  v_diff_pts INTEGER;
  v_total_pts INTEGER;
  v_multiplier INTEGER;
  v_pred_winner INTEGER;
  v_actual_winner INTEGER;
  v_updated_count INTEGER := 0;
BEGIN
  -- Get match details
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found: %', p_match_id;
  END IF;

  -- Cancelled: zero out predictions and return
  IF v_match.status = 'cancelled' THEN
    UPDATE public.predictions
    SET winner_points = 0,
        home_goals_points = 0,
        away_goals_points = 0,
        diff_points = 0,
        total_points = 0
    WHERE match_id = p_match_id;
    PERFORM public.recalculate_group_leaderboard(gp.group_id)
    FROM (SELECT DISTINCT group_id FROM public.predictions WHERE match_id = p_match_id) gp;
    RETURN 0;
  END IF;

  -- Not finished: do nothing
  IF v_match.status <> 'finished' OR v_match.home_goals IS NULL OR v_match.away_goals IS NULL THEN
    RETURN 0;
  END IF;

  v_multiplier := CASE WHEN v_match.is_knockout THEN 2 ELSE 1 END;
  v_actual_winner := SIGN(v_match.home_goals - v_match.away_goals);

  FOR v_pred IN
    SELECT * FROM public.predictions WHERE match_id = p_match_id
  LOOP
    v_pred_winner := SIGN(v_pred.home_goals_predicted - v_pred.away_goals_predicted);
    v_winner_points := CASE WHEN v_pred_winner = v_actual_winner THEN 5 * v_multiplier ELSE 0 END;
    v_home_pts := CASE WHEN v_pred.home_goals_predicted = v_match.home_goals THEN 2 * v_multiplier ELSE 0 END;
    v_away_pts := CASE WHEN v_pred.away_goals_predicted = v_match.away_goals THEN 2 * v_multiplier ELSE 0 END;
    v_diff_pts := CASE
                    WHEN ABS(v_pred.home_goals_predicted - v_pred.away_goals_predicted)
                       = ABS(v_match.home_goals - v_match.away_goals)
                    THEN 1 * v_multiplier
                    ELSE 0
                  END;
    v_total_pts := v_winner_points + v_home_pts + v_away_pts + v_diff_pts;

    UPDATE public.predictions
    SET winner_points = v_winner_points,
        home_goals_points = v_home_pts,
        away_goals_points = v_away_pts,
        diff_points = v_diff_pts,
        total_points = v_total_pts
    WHERE id = v_pred.id;

    v_updated_count := v_updated_count + 1;
  END LOOP;

  -- Recalculate leaderboards for affected groups
  PERFORM public.recalculate_group_leaderboard(gp.group_id)
  FROM (SELECT DISTINCT group_id FROM public.predictions WHERE match_id = p_match_id) gp;

  RETURN v_updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_match_points(UUID) TO service_role;

-- =============================================================================
-- recalculate_group_leaderboard
-- =============================================================================
-- Recalculates total_points and position for all active participants
-- of a group. Position is ranked by total_points DESC, joined_at ASC.

CREATE OR REPLACE FUNCTION public.recalculate_group_leaderboard(p_group_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  WITH totals AS (
    SELECT
      user_id,
      COALESCE(SUM(total_points), 0)::INTEGER AS total_points
    FROM public.predictions
    WHERE group_id = p_group_id
    GROUP BY user_id
  ),
  ranked AS (
    SELECT
      gp.user_id,
      COALESCE(t.total_points, 0) AS new_total,
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(t.total_points, 0) DESC, gp.joined_at ASC
      ) AS new_position
    FROM public.group_participants gp
    LEFT JOIN totals t ON t.user_id = gp.user_id
    WHERE gp.group_id = p_group_id AND gp.status = 'active'
  )
  UPDATE public.group_participants gp
  SET total_points = ranked.new_total,
      position = ranked.new_position
  FROM ranked
  WHERE gp.user_id = ranked.user_id AND gp.group_id = p_group_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_group_leaderboard(UUID) TO service_role;

-- =============================================================================
-- generate_group_short_code
-- =============================================================================
-- Generates a unique 6-char short code from a base32 alphabet
-- (excluding visually confusing chars: 0, O, 1, I, L).
-- Retries up to 5 times on collision. Falls back to UUID-suffix
-- combination if all attempts collide.

CREATE OR REPLACE FUNCTION public.generate_group_short_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_attempts INTEGER := 0;
  v_alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_alphabet_len INTEGER := length(v_alphabet);
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_attempts := v_attempts + 1;
    v_code := '';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * v_alphabet_len)::INTEGER, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.groups WHERE short_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
    EXIT WHEN v_attempts >= 5;
  END LOOP;

  -- Fallback: take first 2 chars of last attempt + 4 hex chars from random UUID
  IF v_exists THEN
    v_code := substr(v_code, 1, 2) ||
              substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 4);
  END IF;

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_group_short_code() TO service_role;

-- =============================================================================
-- get_group_for_invite
-- =============================================================================
-- Returns public-safe group info for the invite page. Accessible to
-- anon users (so they can see group details before deciding to register).

CREATE OR REPLACE FUNCTION public.get_group_for_invite(p_short_code TEXT)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  description TEXT,
  special_conditions TEXT,
  tournament_id UUID,
  tournament_name TEXT,
  tournament_logo_url TEXT,
  starting_phase public.starting_phase_code,
  active_participants BIGINT,
  max_participants INTEGER
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    g.id,
    g.name,
    g.description,
    g.special_conditions,
    g.tournament_id,
    t.name,
    t.logo_url,
    g.starting_phase,
    (SELECT COUNT(*) FROM public.group_participants gp
     WHERE gp.group_id = g.id AND gp.status = 'active'),
    g.max_participants
  FROM public.groups g
  JOIN public.tournaments t ON t.id = g.tournament_id
  WHERE g.short_code = p_short_code
    AND g.status = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.get_group_for_invite(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_group_for_invite(TEXT) TO authenticated;

-- =============================================================================
-- v_group_leaderboard — view with computed columns
-- =============================================================================

CREATE OR REPLACE VIEW public.v_group_leaderboard
WITH (security_invoker = TRUE) AS
SELECT
  gp.group_id,
  gp.user_id,
  u.username,
  u.avatar_url,
  gp.total_points,
  gp.position,
  gp.joined_at,
  COUNT(p.id) FILTER (
    WHERE p.total_points = 10 OR p.total_points = 20
  ) AS perfect_scores,
  COUNT(p.id) FILTER (
    WHERE m.status = 'finished' AND m.id = p.match_id
  ) AS matches_played
FROM public.group_participants gp
JOIN public.users u ON u.id = gp.user_id
LEFT JOIN public.predictions p
  ON p.user_id = gp.user_id AND p.group_id = gp.group_id
LEFT JOIN public.matches m
  ON m.id = p.match_id
WHERE gp.status = 'active'
GROUP BY gp.group_id, gp.user_id, u.username, u.avatar_url,
         gp.total_points, gp.position, gp.joined_at;

GRANT SELECT ON public.v_group_leaderboard TO authenticated;
GRANT SELECT ON public.v_group_leaderboard TO anon;

-- =============================================================================
-- End of migration
-- =============================================================================
