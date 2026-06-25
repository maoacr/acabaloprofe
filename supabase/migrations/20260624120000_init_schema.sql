-- =============================================================================
-- Acabalo Profe — Initial Schema
-- Migration: 20260624120000_init_schema.sql
-- =============================================================================
-- Tables, ENUMs, indexes, generated columns, triggers.
-- RLS policies are in the next migration (20260624120100_rls_policies.sql).
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- Enums
-- =============================================================================

CREATE TYPE public.starting_phase_code AS ENUM (
  'ALL',
  'FROM_ROUND_OF_16',
  'FROM_SEMIFINALS',
  'FINAL_ONLY'
);

-- =============================================================================
-- users — profile mirror of auth.users
-- =============================================================================
-- The id is FK to auth.users. Created in the register Server Action after
-- a successful supabase.auth.signUp(). RLS self-insert with id = auth.uid().

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

-- =============================================================================
-- tournaments
-- =============================================================================

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

-- =============================================================================
-- phases
-- =============================================================================

CREATE TABLE public.phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('group_stage', 'knockout')),
  order_index INTEGER NOT NULL,
  UNIQUE (tournament_id, order_index)
);

CREATE INDEX idx_phases_tournament ON public.phases(tournament_id, order_index);

-- =============================================================================
-- teams
-- =============================================================================

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

-- =============================================================================
-- matches
-- =============================================================================
-- The lock_at column is GENERATED from scheduled_at - 10 minutes.
-- This guarantees the lock window is enforced at the DB level, not just
-- in application code (defense in depth).

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

-- =============================================================================
-- groups (pollas)
-- =============================================================================

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

-- =============================================================================
-- group_participants
-- =============================================================================

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

-- =============================================================================
-- predictions
-- =============================================================================

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

-- =============================================================================
-- updated_at trigger function
-- =============================================================================

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

-- =============================================================================
-- Handle new auth user → create public.users row automatically
-- =============================================================================
-- When Supabase Auth creates a row in auth.users, we automatically insert
-- a corresponding public.users row with default values. The user can later
-- update their profile fields via the application.
--
-- The trigger reads user_metadata that the register Server Action passes
-- (first_name, last_name, username, country, city, timezone).
-- If any required field is missing, the trigger raises an error
-- (the application MUST pass all fields at signup).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_country TEXT;
  v_city TEXT;
  v_timezone TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  v_first_name := NEW.raw_user_meta_data->>'first_name';
  v_last_name := NEW.raw_user_meta_data->>'last_name';
  v_username := NEW.raw_user_meta_data->>'username';
  v_country := NEW.raw_user_meta_data->>'country';
  v_city := NEW.raw_user_meta_data->>'city';
  v_timezone := NEW.raw_user_meta_data->>'timezone';

  -- Required fields
  IF v_first_name IS NULL OR v_last_name IS NULL OR v_username IS NULL
     OR v_country IS NULL OR v_city IS NULL OR v_timezone IS NULL THEN
    RAISE EXCEPTION 'Missing required user metadata: first_name, last_name, username, country, city, timezone are all required';
  END IF;

  INSERT INTO public.users (id, username, email, first_name, last_name, country, city, timezone)
  VALUES (
    NEW.id,
    v_username,
    NEW.email,
    v_first_name,
    v_last_name,
    v_country,
    v_city,
    v_timezone
  );

  RETURN NEW;
END;
$$;

-- Trigger fires after INSERT on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- End of migration
-- =============================================================================
