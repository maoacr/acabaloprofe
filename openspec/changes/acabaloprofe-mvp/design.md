# Design: acabalojuez-mvp

> Technical architecture for the MVP. Translates the 7 capability specs
> into concrete file structure, SQL schema, type contracts, and
> runtime contracts (Server Actions, Edge Functions, API Routes).

## Goals

1. Map the 7 specs to concrete files with single-responsibility boundaries.
2. Define the SQL schema (tables, indexes, RLS policies, views, RPC functions).
3. Lock the TypeScript domain types so all layers agree.
4. Define Server Action / Edge Function / API Route contracts.
5. Identify cross-cutting utilities (formatters, time helpers, validators).

## Non-Goals (deferred to Fase 2/3)

- Realtime subscriptions (Supabase Realtime client).
- Push notifications (VAPID, service worker).
- Web Share API integration.
- Haptic feedback utilities.
- External results API integration.
- Admin UI for tournament/match CRUD (we use SQL seeds).
- Profile editing UI.
- Personal statistics dashboard.

---

## 1. Directory Structure

Clean Architecture in 4 layers. Each layer has a single responsibility.

```
acabaloprofe/
├── .atl/
│   └── skill-registry.md
├── openspec/
│   └── changes/
│       └── acabalojuez-mvp/
│           ├── explore.md
│           ├── proposal.md
│           ├── design.md                  ← THIS FILE
│           ├── specs/
│           │   ├── 01-auth.md
│           │   ├── 02-groups-predictions.md
│           │   └── 03-scoring-leaderboard.md
│           └── tasks.md                   (next phase)
├── supabase/
│   ├── config.toml                        (local Supabase config)
│   ├── migrations/
│   │   ├── 20260624120000_init_schema.sql
│   │   ├── 20260624120100_rls_policies.sql
│   │   ├── 20260624120200_rpc_functions.sql
│   │   └── 20260624120300_seed_demo_tournament.sql
│   └── seed.sql                           (runnable via supabase db reset)
├── src/
│   ├── app/
│   │   ├── layout.tsx                     (root layout, PWA meta, theme)
│   │   ├── page.tsx                       (landing)
│   │   ├── globals.css
│   │   ├── manifest.json                  (basic PWA manifest, no SW)
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                 (centered card layout, no nav)
│   │   │   ├── login/page.tsx
│   │   │   ├── registro/page.tsx
│   │   │   └── recuperar/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx                 (authenticated layout with nav)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── grupos/
│   │   │   │   ├── page.tsx               (list of user's groups)
│   │   │   │   ├── nuevo/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx           (group home: leaderboard + next matches)
│   │   │   │       ├── partidos/page.tsx  (all matches with prediction form)
│   │   │   │       └── admin/page.tsx     (admin panel)
│   │   │   └── perfil/page.tsx            (read-only for MVP)
│   │   ├── unirse/
│   │   │   └── [code]/page.tsx            (invite acceptance)
│   │   ├── admin/
│   │   │   └── resultados/page.tsx        (system admin result entry)
│   │   ├── auth/
│   │   │   ├── callback/route.ts          (Supabase auth callback)
│   │   │   └── signout/route.ts           (signout handler)
│   │   └── api/
│   │       └── cron/
│   │           ├── lock-predictions/route.ts
│   │           └── calculate-points/route.ts
│   ├── domain/                            (pure TypeScript, no I/O)
│   │   ├── types.ts                       (Tournament, Match, Group, Prediction, etc.)
│   │   ├── scoring.ts                     (calculatePoints — CRITICAL, tested first)
│   │   ├── short-code.ts                  (base32 generator with retry)
│   │   └── lock.ts                        (isMatchLocked helper)
│   ├── application/                       (use cases, orchestrate domain)
│   │   ├── auth/
│   │   │   ├── register.ts                (server action: registerUser)
│   │   │   ├── login.ts                   (server action: signIn)
│   │   │   ├── logout.ts                  (server action: signOut)
│   │   │   └── recover-password.ts
│   │   ├── groups/
│   │   │   ├── create-group.ts
│   │   │   ├── join-group.ts
│   │   │   ├── leave-group.ts
│   │   │   ├── list-user-groups.ts
│   │   │   ├── get-group.ts
│   │   │   └── manage-participants.ts     (activate/deactivate)
│   │   ├── predictions/
│   │   │   ├── submit-prediction.ts
│   │   │   ├── get-my-predictions.ts
│   │   │   └── get-group-predictions.ts   (RLS-aware)
│   │   ├── matches/
│   │   │   ├── get-group-matches.ts
│   │   │   ├── enter-match-result.ts      (admin only)
│   │   │   └── cancel-match.ts            (admin only)
│   │   ├── leaderboard/
│   │   │   └── get-group-leaderboard.ts
│   │   └── tournaments/
│   │       ├── list-active-tournaments.ts
│   │       └── get-tournament.ts
│   ├── infrastructure/                    (Supabase clients, external APIs)
│   │   ├── supabase/
│   │   │   ├── server.ts                  (server-side client, RSC + Server Actions)
│   │   │   ├── client.ts                  (browser client)
│   │   │   ├── middleware.ts              (session refresh in middleware)
│   │   │   └── service-role.ts            (server-only, for cron jobs)
│   │   ├── time/
│   │   │   └── format.ts                  (date-fns-tz wrappers)
│   │   └── env.ts                         (typed env access with validation)
│   ├── interface/                         (UI layer, React components)
│   │   ├── components/
│   │   │   ├── ui/                        (primitives: Button, Input, Card, Toast)
│   │   │   ├── forms/                     (GoalInput, PasswordField, CountrySelect, TimezoneSelect)
│   │   │   ├── auth/                      (LoginForm, RegisterForm, RecoveryForm)
│   │   │   ├── groups/                    (GroupCard, InviteLinkBox, ParticipantList, CreateGroupForm)
│   │   │   ├── matches/                   (MatchCard, MatchStatusBadge, CountdownTimer)
│   │   │   ├── predictions/               (PredictionForm, PredictionList)
│   │   │   ├── leaderboard/               (LeaderboardTable, LeaderboardRow, Podium)
│   │   │   └── layout/                    (AppNav, AuthNav, MobileMenu)
│   │   ├── hooks/                         (useGroup, useLeaderboard, useCountdown)
│   │   └── providers/                     (ThemeProvider, ToastProvider, QueryProvider)
│   ├── lib/
│   │   ├── utils.ts                       (cn helper — already exists)
│   │   ├── constants.ts                   (countries, timezones, phase codes, MAX_PARTICIPANTS)
│   │   └── result.ts                      (Result<T, E> type for Server Action returns)
│   └── middleware.ts                      (protected route guard)
├── tests/
│   ├── unit/
│   │   ├── scoring.test.ts                (12+ cases — FIRST to write, before implementation)
│   │   ├── short-code.test.ts
│   │   ├── lock.test.ts
│   │   ├── env.test.ts
│   │   └── schemas/
│   │       ├── auth.test.ts
│   │       ├── group.test.ts
│   │       └── prediction.test.ts
│   ├── integration/                       (uses supabase local or test schema)
│   │   ├── auth.test.ts
│   │   ├── group-lifecycle.test.ts
│   │   ├── prediction-rls.test.ts         (CRITICAL: RLS visibility tests)
│   │   ├── scoring-integration.test.ts
│   │   └── leaderboard.test.ts
│   ├── e2e/
│   │   ├── auth.spec.ts
│   │   ├── group-create-join.spec.ts
│   │   ├── prediction-submit-lock.spec.ts
│   │   └── happy-path.spec.ts             (full flow E2E)
│   ├── setup.ts
│   └── helpers/
│       ├── supabase-test.ts
│       └── factories.ts                   (test data builders)
├── .env.example
├── .env.local                             (gitignored, user fills this)
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
├── postcss.config.mjs
├── vitest.config.ts
├── vitest.setup.ts
├── playwright.config.ts
├── README.md
└── .eslintrc.json
```

**Layer rules:**

- `domain/` depends on NOTHING (pure TS).
- `application/` depends on `domain/` and `infrastructure/`.
- `infrastructure/` depends on `domain/` and external packages.
- `interface/` depends on `application/`, `domain/`, `infrastructure/`.
- Tests live in `tests/` and can depend on any layer.

---

## 2. SQL Schema

### 2.1 Tables

```sql
-- Migration 20260624120000_init_schema.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ users ============
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL
    CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  email TEXT UNIQUE NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  first_name TEXT NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 50),
  last_name TEXT NOT NULL CHECK (char_length(last_name) BETWEEN 1 AND 50),
  country TEXT NOT NULL,
  city TEXT NOT NULL CHECK (char_length(city) BETWEEN 1 AND 100),
  timezone TEXT NOT NULL,
  avatar_url TEXT,
  is_system_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_email ON public.users(email);

-- ============ tournaments ============
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'active', 'finished')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tournaments_status ON public.tournaments(status);

-- ============ phases ============
CREATE TABLE public.phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('group_stage', 'knockout')),
  order_index INTEGER NOT NULL,
  UNIQUE (tournament_id, order_index)
);

CREATE INDEX idx_phases_tournament ON public.phases(tournament_id, order_index);

-- ============ teams ============
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name CHAR(3) NOT NULL,
  flag_url TEXT,
  group_name TEXT
);

CREATE INDEX idx_teams_tournament ON public.teams(tournament_id);
CREATE INDEX idx_teams_group ON public.teams(tournament_id, group_name);

-- ============ matches ============
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES public.phases(id) ON DELETE CASCADE,
  home_team_id UUID NOT NULL REFERENCES public.teams(id),
  away_team_id UUID NOT NULL REFERENCES public.teams(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  lock_at TIMESTAMPTZ GENERATED ALWAYS AS (scheduled_at - INTERVAL '10 minutes') STORED,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'finished', 'cancelled')),
  home_goals INTEGER CHECK (home_goals BETWEEN 0 AND 20),
  away_goals INTEGER CHECK (away_goals BETWEEN 0 AND 20),
  is_knockout BOOLEAN NOT NULL DEFAULT FALSE,
  matchday TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (home_team_id <> away_team_id)
);

CREATE INDEX idx_matches_tournament ON public.matches(tournament_id);
CREATE INDEX idx_matches_phase ON public.matches(phase_id, scheduled_at);
CREATE INDEX idx_matches_scheduled ON public.matches(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_matches_lock_pending ON public.matches(lock_at) WHERE status = 'scheduled';

-- ============ groups (pollas) ============
CREATE TYPE public.starting_phase_code AS ENUM (
  'ALL', 'FROM_ROUND_OF_16', 'FROM_SEMIFINALS', 'FINAL_ONLY'
);

CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT UNIQUE NOT NULL
    CHECK (short_code ~ '^[A-Z0-9]{6}$'),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 60),
  description TEXT CHECK (char_length(description) <= 500),
  special_conditions TEXT CHECK (char_length(special_conditions) <= 1000),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id),
  starting_phase public.starting_phase_code NOT NULL,
  admin_user_id UUID NOT NULL REFERENCES public.users(id),
  max_participants INTEGER NOT NULL DEFAULT 100 CHECK (max_participants BETWEEN 2 AND 100),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_groups_tournament ON public.groups(tournament_id);
CREATE INDEX idx_groups_admin ON public.groups(admin_user_id);
CREATE INDEX idx_groups_short_code ON public.groups(short_code);

-- ============ group_participants ============
CREATE TABLE public.group_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  total_points INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_gp_group_active ON public.group_participants(group_id) WHERE status = 'active';
CREATE INDEX idx_gp_user ON public.group_participants(user_id);
CREATE INDEX idx_gp_leaderboard ON public.group_participants(group_id, status, total_points DESC, joined_at ASC)
  WHERE status = 'active';

-- ============ predictions ============
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  home_goals_predicted INTEGER NOT NULL CHECK (home_goals_predicted BETWEEN 0 AND 20),
  away_goals_predicted INTEGER NOT NULL CHECK (away_goals_predicted BETWEEN 0 AND 20),
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  winner_points INTEGER NOT NULL DEFAULT 0,
  home_goals_points INTEGER NOT NULL DEFAULT 0,
  away_goals_points INTEGER NOT NULL DEFAULT 0,
  diff_points INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, match_id, group_id)
);

CREATE INDEX idx_predictions_user_group ON public.predictions(user_id, group_id);
CREATE INDEX idx_predictions_match_group ON public.predictions(match_id, group_id);
CREATE INDEX idx_predictions_locked ON public.predictions(match_id, is_locked);

-- ============ updated_at triggers ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_predictions_updated_at
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

### 2.2 RLS Policies

```sql
-- Migration 20260624120100_rls_policies.sql

-- Enable RLS on every table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- ============ users ============
-- Anyone authenticated can read user profile (needed for leaderboard, group members)
CREATE POLICY "users_select_authenticated" ON public.users
  FOR SELECT TO authenticated USING (TRUE);

-- Users can update their own profile (but the API layer restricts which fields)
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Insert: triggered by Supabase Auth (auth.uid() = new row's id)
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ============ tournaments / phases / teams ============
-- Public read (needed for invite pages, even unauthenticated)
CREATE POLICY "tournaments_select_all" ON public.tournaments
  FOR SELECT USING (TRUE);
CREATE POLICY "phases_select_all" ON public.phases
  FOR SELECT USING (TRUE);
CREATE POLICY "teams_select_all" ON public.teams
  FOR SELECT USING (TRUE);

-- Only service role writes (no policies = no anon write)

-- ============ matches ============
-- Public read, but live/scheduled results hidden via column-level GRANT
CREATE POLICY "matches_select_all" ON public.matches
  FOR SELECT USING (TRUE);

-- Only system admin or service role can update
CREATE POLICY "matches_update_admin" ON public.matches
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_system_admin = TRUE)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_system_admin = TRUE)
  );

-- ============ groups ============
-- Any authenticated user can read groups (needed for invite page)
CREATE POLICY "groups_select_authenticated" ON public.groups
  FOR SELECT TO authenticated USING (TRUE);

-- Anon can read groups (so /unirse/[code] works before login)
CREATE POLICY "groups_select_anon" ON public.groups
  FOR SELECT TO anon USING (TRUE);

-- Authenticated users can create groups (they become admin)
CREATE POLICY "groups_insert_authenticated" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (admin_user_id = auth.uid());

-- Only the group admin can update their group
CREATE POLICY "groups_update_admin" ON public.groups
  FOR UPDATE TO authenticated
  USING (admin_user_id = auth.uid())
  WITH CHECK (admin_user_id = auth.uid());

-- NO DELETE policy. Deletion is support-only.

-- ============ group_participants ============
-- Active participants of a group can see all participants of that group
CREATE POLICY "gp_select_group_members" ON public.group_participants
  FOR SELECT TO authenticated
  USING (
    -- User is a participant of the same group
    EXISTS (
      SELECT 1 FROM public.group_participants gp2
      WHERE gp2.group_id = group_participants.group_id
        AND gp2.user_id = auth.uid()
    )
    OR -- Or the group is being viewed via invite (anon can see count via separate view)
       FALSE
  );

-- Allow reading own participation for any user
CREATE POLICY "gp_select_own" ON public.group_participants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Anon can read participants count via a separate function (not direct table)
-- (handled in RPC functions, not policy)

-- Insert: any authenticated user can join a group (application layer checks limits)
CREATE POLICY "gp_insert_authenticated" ON public.group_participants
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update: only the group's admin can change participant status
CREATE POLICY "gp_update_group_admin" ON public.group_participants
  FOR UPDATE TO authenticated
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

-- ============ predictions (CRITICAL) ============
-- Users can read their own predictions always
-- Users can read others' predictions ONLY if the prediction is locked AND
-- the user is an active participant of the same group
CREATE POLICY "predictions_select_policy" ON public.predictions
  FOR SELECT TO authenticated
  USING (
    -- Always see your own
    user_id = auth.uid()
    OR (
      -- Others' only when locked AND in same group
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
CREATE POLICY "predictions_insert_own" ON public.predictions
  FOR INSERT TO authenticated
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

-- Update: same restrictions
CREATE POLICY "predictions_update_own_unlocked" ON public.predictions
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND is_locked = FALSE
  )
  WITH CHECK (
    user_id = auth.uid()
    AND is_locked = FALSE
  );
```

### 2.3 RPC Functions

```sql
-- Migration 20260624120200_rpc_functions.sql

-- Lock predictions for matches whose lock_at has passed
CREATE OR REPLACE FUNCTION public.lock_pending_predictions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Calculate points for a finished match and update predictions + group totals
CREATE OR REPLACE FUNCTION public.recalculate_match_points(p_match_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- If match is cancelled, zero out all predictions
  IF v_match.status = 'cancelled' THEN
    UPDATE public.predictions
    SET winner_points = 0,
        home_goals_points = 0,
        away_goals_points = 0,
        diff_points = 0,
        total_points = 0
    WHERE match_id = p_match_id;
    -- Recalculate leaderboards for affected groups
    PERFORM public.recalculate_group_leaderboard(gp.group_id)
    FROM (SELECT DISTINCT group_id FROM public.predictions WHERE match_id = p_match_id) gp;
    RETURN 0;
  END IF;

  -- If match is not finished, do nothing
  IF v_match.status <> 'finished' OR v_match.home_goals IS NULL OR v_match.away_goals IS NULL THEN
    RETURN 0;
  END IF;

  v_multiplier := CASE WHEN v_match.is_knockout THEN 2 ELSE 1 END;
  v_actual_winner := SIGN(v_match.home_goals - v_match.away_goals);

  -- Update each prediction
  FOR v_pred IN
    SELECT * FROM public.predictions WHERE match_id = p_match_id
  LOOP
    v_pred_winner := SIGN(v_pred.home_goals_predicted - v_pred.away_goals_predicted);

    v_winner_points := CASE WHEN v_pred_winner = v_actual_winner THEN 5 * v_multiplier ELSE 0 END;
    v_home_pts     := CASE WHEN v_pred.home_goals_predicted = v_match.home_goals THEN 2 * v_multiplier ELSE 0 END;
    v_away_pts     := CASE WHEN v_pred.away_goals_predicted = v_match.away_goals THEN 2 * v_multiplier ELSE 0 END;
    v_diff_pts     := CASE
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

-- Recalculate leaderboard for a single group
CREATE OR REPLACE FUNCTION public.recalculate_group_leaderboard(p_group_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- View: leaderboard with computed columns
CREATE OR REPLACE VIEW public.v_group_leaderboard AS
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

-- Generate unique short code for a group (called from Server Action)
CREATE OR REPLACE FUNCTION public.generate_group_short_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_attempts INTEGER := 0;
  v_alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- exclude 0,O,1,I,L
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_attempts := v_attempts + 1;
    v_code := '';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::INTEGER, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.groups WHERE short_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
    EXIT WHEN v_attempts >= 5;
  END LOOP;
  IF v_exists THEN
    -- Fallback: append random suffix
    v_code := substr(v_code, 1, 4) || substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 2);
  END IF;
  RETURN v_code;
END;
$$;

-- RPC: get group info for invite page (anon-safe)
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

GRANT EXECUTE ON FUNCTION public.get_group_for_invite TO anon;
GRANT EXECUTE ON FUNCTION public.get_group_for_invite TO authenticated;
```

### 2.4 Seed Data

```sql
-- Migration 20260624120300_seed_demo_tournament.sql

-- Demo tournament: Mundial Demo 2026
INSERT INTO public.tournaments (id, name, slug, logo_url, start_date, end_date, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Mundial Demo 2026',
  'mundial-demo-2026',
  NULL,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '60 days',
  'active'
);

-- Phases: group stage (1) + round of 16 (2) + quarters (3) + semis (4) + 3rd place (5) + final (6)
INSERT INTO public.phases (id, tournament_id, name, type, order_index) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Fase de Grupos', 'group_stage', 1),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Octavos de Final', 'knockout', 2),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Cuartos de Final', 'knockout', 3),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Semifinales', 'knockout', 4),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Tercer Puesto', 'knockout', 5),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Final', 'knockout', 6);

-- 32 teams across 8 groups (A-H), 4 teams per group
-- Using Latin American country names with flag emoji as flag_url
INSERT INTO public.teams (id, tournament_id, name, short_name, flag_url, group_name) VALUES
  -- Group A
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Argentina', 'ARG', '🇦🇷', 'Grupo A'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Brasil', 'BRA', '🇧🇷', 'Grupo A'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Chile', 'CHI', '🇨🇱', 'Grupo A'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Uruguay', 'URU', '🇺🇾', 'Grupo A'),
  -- Group B
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Colombia', 'COL', '🇨🇴', 'Grupo B'),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Perú', 'PER', '🇵🇪', 'Grupo B'),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Ecuador', 'ECU', '🇪🇨', 'Grupo B'),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Venezuela', 'VEN', '🇻🇪', 'Grupo B'),
  -- Group C
  ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'México', 'MEX', '🇲🇽', 'Grupo C'),
  ('20000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Estados Unidos', 'USA', '🇺🇸', 'Grupo C'),
  ('20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Costa Rica', 'CRC', '🇨🇷', 'Grupo C'),
  ('20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Panamá', 'PAN', '🇵🇦', 'Grupo C'),
  -- Group D
  ('20000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'España', 'ESP', '🇪🇸', 'Grupo D'),
  ('20000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Paraguay', 'PAR', '🇵🇾', 'Grupo D'),
  ('20000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'Bolivia', 'BOL', '🇧🇴', 'Grupo D'),
  ('20000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'Guatemala', 'GUA', '🇬🇹', 'Grupo D'),
  -- (Groups E-H omitted for brevity, same pattern)

-- Sample matches: a few in each phase to demonstrate the system
-- Group A matches
INSERT INTO public.matches (id, tournament_id, phase_id, home_team_id, away_team_id, scheduled_at, is_knockout, matchday) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', NOW() + INTERVAL '2 days', FALSE, 'Fecha 1'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', NOW() + INTERVAL '2 days', FALSE, 'Fecha 1'),
  -- ... more matches
;
-- (Add 30+ group stage matches + 16 knockout matches in the actual seed)

-- Note: knockouts' home_team_id/away_team_id are NULL until populated by auto-bracket logic (Fase 3)
-- For demo MVP, we set them to placeholder teams so the UI can be tested.
```

---

## 3. TypeScript Domain Types

```typescript
// src/domain/types.ts

// ============ Enums ============
export type TournamentStatus = 'upcoming' | 'active' | 'finished';
export type PhaseType = 'group_stage' | 'knockout';
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';
export type GroupStatus = 'active' | 'inactive';
export type ParticipantStatus = 'active' | 'inactive';
export type StartingPhaseCode = 'ALL' | 'FROM_ROUND_OF_16' | 'FROM_SEMIFINALS' | 'FINAL_ONLY';

// ============ User ============
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  city: string;
  timezone: string;
  avatarUrl: string | null;
  isSystemAdmin: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

// ============ Tournament ============
export interface Tournament {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  status: TournamentStatus;
}

export interface Phase {
  id: string;
  tournamentId: string;
  name: string;
  type: PhaseType;
  orderIndex: number;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  shortName: string; // 3 chars
  flagUrl: string | null;
  groupName: string | null;
}

// ============ Match ============
export interface Match {
  id: string;
  tournamentId: string;
  phaseId: string;
  homeTeam: Team;
  awayTeam: Team;
  scheduledAt: string; // ISO 8601 UTC
  lockAt: string; // computed
  status: MatchStatus;
  homeGoals: number | null; // null when scheduled/live and user is not admin
  awayGoals: number | null;
  isKnockout: boolean;
  matchday: string | null;
}

// Admin-only view that includes live results
export interface AdminMatch extends Match {
  homeGoals: number; // always present
  awayGoals: number; // always present
}

// ============ Group ============
export interface FootballGroup {
  id: string;
  shortCode: string;
  name: string;
  description: string | null;
  specialConditions: string | null;
  tournamentId: string;
  startingPhase: StartingPhaseCode;
  adminUserId: string;
  maxParticipants: number;
  status: GroupStatus;
  createdAt: string;
}

export interface GroupParticipant {
  id: string;
  groupId: string;
  userId: string;
  username?: string; // joined from users
  avatarUrl?: string | null;
  status: ParticipantStatus;
  totalPoints: number;
  position: number;
  joinedAt: string;
}

// ============ Prediction ============
export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  groupId: string;
  homeGoalsPredicted: number;
  awayGoalsPredicted: number;
  isLocked: boolean;
  pointsEarned: PointBreakdown | null;
  submittedAt: string;
  updatedAt: string;
}

export interface PointBreakdown {
  winnerPoints: number;
  homeGoalsPoints: number;
  awayGoalsPoints: number;
  diffPoints: number;
  totalPoints: number;
}

// ============ Leaderboard ============
export interface LeaderboardEntry {
  position: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalPoints: number;
  matchesPlayed: number;
  perfectScores: number;
  joinedAt: string;
}

// ============ Scoring inputs ============
export interface PredictionInput {
  home: number;
  away: number;
}

export interface ResultInput {
  home: number;
  away: number;
}

// ============ Result wrapper for Server Actions ============
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };
```

---

## 4. Scoring Function (CRITICAL — pure, tested first)

```typescript
// src/domain/scoring.ts
import type { PointBreakdown, PredictionInput, ResultInput } from './types';

/**
 * Pure function. Single source of truth for scoring.
 * MUST be tested with 12+ cases BEFORE implementation of the rest of the app.
 */
export function calculatePoints(
  prediction: PredictionInput,
  result: ResultInput,
  isKnockout: boolean,
): PointBreakdown {
  const multiplier = isKnockout ? 2 : 1;
  const sign = (n: number): -1 | 0 | 1 => (n > 0 ? 1 : n < 0 ? -1 : 0);

  const predictedWinner = sign(prediction.home - prediction.away);
  const actualWinner = sign(result.home - result.away);
  const predictedDiff = Math.abs(prediction.home - prediction.away);
  const actualDiff = Math.abs(result.home - result.away);

  const winnerPoints = predictedWinner === actualWinner ? 5 * multiplier : 0;
  const homeGoalsPoints = prediction.home === result.home ? 2 * multiplier : 0;
  const awayGoalsPoints = prediction.away === result.away ? 2 * multiplier : 0;
  const diffPoints = predictedDiff === actualDiff ? 1 * multiplier : 0;

  return {
    winnerPoints,
    homeGoalsPoints,
    awayGoalsPoints,
    diffPoints,
    totalPoints: winnerPoints + homeGoalsPoints + awayGoalsPoints + diffPoints,
  };
}

/**
 * Determines the points a match is "worth" max.
 */
export function maxPointsForMatch(isKnockout: boolean): number {
  return isKnockout ? 20 : 10;
}

/**
 * Returns whether a match result indicates a draw.
 */
export function isDraw(result: ResultInput): boolean {
  return result.home === result.away;
}
```

---

## 5. Server Action / API Route Contracts

### 5.1 Server Actions (user-facing)

| Action | File | Input | Output | Authorization |
|--------|------|-------|--------|---------------|
| `registerUser` | `application/auth/register.ts` | `RegisterInput` (Zod) | `ActionResult<{ userId: string }>` | Public |
| `signIn` | `application/auth/login.ts` | `LoginInput` | `ActionResult<{ userId: string }>` | Public |
| `signOut` | `application/auth/logout.ts` | — | `ActionResult` | Authenticated |
| `recoverPassword` | `application/auth/recover-password.ts` | `{ email: string }` | `ActionResult` (always ok) | Public |
| `createGroup` | `application/groups/create-group.ts` | `CreateGroupInput` | `ActionResult<{ groupId: string; shortCode: string }>` | Authenticated |
| `joinGroup` | `application/groups/join-group.ts` | `{ shortCode: string }` | `ActionResult<{ groupId: string }>` | Authenticated |
| `leaveGroup` | `application/groups/leave-group.ts` | `{ groupId: string }` | `ActionResult` | Authenticated, not admin |
| `toggleParticipant` | `application/groups/manage-participants.ts` | `{ groupId, userId, status }` | `ActionResult` | Authenticated, group admin |
| `submitPrediction` | `application/predictions/submit-prediction.ts` | `SubmitPredictionInput` | `ActionResult<{ predictionId: string }>` | Authenticated, group member, match unlocked |
| `enterMatchResult` | `application/matches/enter-match-result.ts` | `{ matchId, homeGoals, awayGoals }` | `ActionResult<{ updatedPredictions: number }>` | System admin only |

### 5.2 API Routes (cron + special)

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/cron/lock-predictions` | POST | Run the lock job. Calls `lock_pending_predictions()` RPC. | `Authorization: Bearer ${CRON_SECRET}` header |
| `/api/cron/calculate-points` | POST | Re-run scoring for finished matches since last run. (Manual trigger only for MVP.) | Same |
| `/auth/callback` | GET | Supabase OAuth/magic link callback. Exchanges code for session. | Public |
| `/auth/signout` | POST | Server-side signout, clears cookies. | Authenticated |

### 5.3 Cron Schedule

For MVP, the lock cron is configured to run every 5 minutes:

```yaml
# vercel.json (future, when deployed)
{
  "crons": [
    { "path": "/api/cron/lock-predictions", "schedule": "*​/5 * * * *" }
  ]
}
```

For local dev, use `node-cron` or a simple `setInterval` script in a dev-only route.

---

## 6. Cross-cutting Utilities

### 6.1 Env Validation (`src/infrastructure/env.ts`)

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  CRON_SECRET: z.string().min(16).optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  CRON_SECRET: process.env.CRON_SECRET,
});
```

Fails fast at startup if env is invalid. Tests verify the failure modes.

### 6.2 Time/Timezone Helpers (`src/infrastructure/time/format.ts`)

```typescript
import { format, formatDistanceToNow } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

export function formatMatchTime(utc: string, userTimezone: string): string {
  return formatInTimeZone(new Date(utc), userTimezone, "EEE d 'de' MMM, HH:mm", { locale: es });
}

export function formatCountdown(targetUtc: string): string {
  // Returns "HH:MM:SS" or "MM:SS" depending on remaining time
  // ...
}

export function isMatchLocked(lockAt: string): boolean {
  return new Date(lockAt) <= new Date();
}
```

### 6.3 Constants (`src/lib/constants.ts`)

```typescript
import type { StartingPhaseCode } from '@/domain/types';

export const COUNTRIES = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica',
  'Ecuador', 'El Salvador', 'España', 'Estados Unidos', 'Guatemala',
  'Honduras', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú',
  'Puerto Rico', 'Rep. Dominicana', 'Uruguay', 'Venezuela',
] as const;
export type Country = typeof COUNTRIES[number];

export const TIMEZONES = [
  'America/Argentina/Buenos_Aires', 'America/Bogota', 'America/Lima',
  'America/Mexico_City', 'America/New_York', 'Europe/Madrid',
  'UTC',
  // ... full list GMT-12 to GMT+12
] as const;

export const PHASE_CODE_DESCRIPTIONS: Record<StartingPhaseCode, string> = {
  ALL: 'Todos los partidos del torneo',
  FROM_ROUND_OF_16: 'Desde octavos de final',
  FROM_SEMIFINALS: 'Desde semifinales',
  FINAL_ONLY: 'Solo tercer puesto y final',
};

export const MAX_PARTICIPANTS_PER_GROUP = 100;
export const PREDICTION_LOCK_MINUTES = 10;
export const MAX_GOALS_PER_SIDE = 20;
```

---

## 7. Form Schemas (Zod)

```typescript
// src/lib/auth/zod-schemas.ts
import { z } from 'zod';
import { COUNTRIES, TIMEZONES } from '@/lib/constants';

export const registerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  username: z.string()
    .min(3).max(30)
    .regex(/^[a-z0-9_]+$/, 'Solo letras minúsculas, números y guión bajo'),
  email: z.string().email(),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Za-z]/, 'Debe contener al menos una letra')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirmPassword: z.string(),
  country: z.enum(COUNTRIES),
  city: z.string().min(1).max(100),
  timezone: z.enum(TIMEZONES),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los términos y condiciones' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().min(1), // username OR email
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const recoverPasswordSchema = z.object({
  email: z.string().email(),
});
export type RecoverPasswordInput = z.infer<typeof recoverPasswordSchema>;
```

---

## 8. Testing Strategy

### 8.1 Strict TDD Order

For each component, the order is:
1. Write failing test
2. Run test, confirm it fails for the right reason
3. Write minimum implementation
4. Run test, confirm it passes
5. Refactor if needed
6. Next test

### 8.2 Coverage Targets

| File | Min coverage |
|------|--------------|
| `src/domain/scoring.ts` | 100% lines, 100% branches |
| `src/domain/short-code.ts` | 100% lines |
| `src/application/**/*.ts` | 85% lines |
| `src/lib/auth/zod-schemas.ts` | 90% lines |
| `src/lib/constants.ts` | N/A (data file) |
| `src/interface/**/!(*.tsx)` | 70% lines |
| **Overall** | **80% lines, 75% branches, 80% functions** |

### 8.3 Critical RLS Test

```typescript
// tests/integration/prediction-rls.test.ts
describe('predictions RLS', () => {
  it('prevents User B from reading User A unlocked prediction', async () => {
    // Setup: create tournament, group, two users A and B, both join group
    // User A submits a prediction
    // is_locked should be false
    // Sign in as User B, query predictions
    // Expect: 0 rows visible
  });

  it('allows User B to read User A locked prediction', async () => {
    // Same setup, then run lock_pending_predictions() as service role
    // Query as User B
    // Expect: 1 row visible
  });

  it('prevents User C (non-member) from reading any predictions', async () => {
    // Create User C not in the group
    // Query as User C
    // Expect: 0 rows
  });

  it('prevents updating a locked prediction', async () => {
    // Lock a prediction
    // Try to update as the owner
    // Expect: RLS blocks (0 rows updated)
  });
});
```

---

## 9. Data Flow Examples

### 9.1 User Submits a Prediction

```
[Client: /grupos/[id]/partidos]
  ↓ form submit (auto-save debounce 800ms)
[Server Action: submitPrediction(input)]
  ↓ zod validation
[Check: user is active participant of group]  ← group_participants query
[Check: match is scheduled AND lock_at > NOW()]  ← matches query
  ↓ UPSERT into predictions
[Postgres: INSERT or UPDATE on predictions]
  ↓ RLS policy enforcement
[Return ActionResult<{ predictionId }>]
  ↓
[Client: toast + haptic feedback]
```

### 9.2 Cron Locks Predictions

```
[Vercel Cron: every 5 min]
  ↓ POST /api/cron/lock-predictions with Bearer CRON_SECRET
[Route handler: verify CRON_SECRET, use service_role client]
  ↓ CALL public.lock_pending_predictions()
[Postgres: UPDATE predictions SET is_locked = TRUE ...]
  ↓ returns locked count
[Log: { timestamp, lockedCount, durationMs }]
  ↓
[Return 200 with { lockedCount }]
```

### 9.3 Admin Enters Result

```
[Client: /admin/resultados]
  ↓ form submit
[Server Action: enterMatchResult(input)]
  ↓ verify is_system_admin
  ↓ UPDATE matches SET status='finished', home_goals, away_goals
[Postgres: matches UPDATE via admin policy]
  ↓ CALL public.recalculate_match_points(matchId)
[Postgres RPC: updates all predictions for this match + recalculates leaderboards]
  ↓ returns updated count
[Return ActionResult<{ updatedPredictions: number }>]
  ↓
[Client: navigate to /grupos/[id] and see updated leaderboard]
```

---

## 10. Open Questions Resolved (from explore)

| Question | Resolution |
|----------|------------|
| Supabase strategy | Real cloud project (user created) |
| Tournament data | Demo Mundial Demo 2026 via seed |
| Magic link | Deferred to Fase 2 (password only) |
| System admin | `is_system_admin` boolean, set manually by user |
| Auth client | `@supabase/ssr` exclusively |
| Scoring location | Pure TS `src/domain/scoring.ts` + SQL RPC for batch recalc |
| RLS for predictions | CRITICAL policy locked above |
| Timezone handling | `TIMESTAMPTZ` everywhere, `date-fns-tz` for display |
| Cron strategy | Vercel Cron in prod, `setInterval` in dev |
| Group delete | NOT possible from UI/API — support only |

---

## 11. Risks Carried Forward

| Risk | Mitigation in design |
|------|----------------------|
| RLS misconfiguration | 4 explicit RLS tests in integration suite |
| Scoring edge cases | 12+ unit tests covering all branches |
| Timezone bugs | DB uses `TIMESTAMPTZ`, client uses `date-fns-tz` with user.timezone |
| Short code collisions | SQL function retries 5x, fallback to UUID-suffix |
| Cron failure | Cron route returns counts; failures logged and alerted via Vercel |
| Match not yet in scoring | RLS prevents non-admin from seeing live results |

---

## 12. Next Step

**`sdd-tasks acabalojuez-mvp`** — break the design into implementation tasks organized into 7 chained PRs (per the proposal's review workload forecast).

Each task will be:
- A work unit (one commit)
- Tagged with its PR number (PR1, PR2, etc.)
- Include test requirements
- Sized to be reviewable in isolation

Tasks will be ordered by dependency: domain → infrastructure → application → interface → migrations → tests → cron.
