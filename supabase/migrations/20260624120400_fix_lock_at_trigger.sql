-- =============================================================================
-- Fix: replace GENERATED lock_at column with trigger-based computation
-- Migration: 20260624120400_fix_lock_at_trigger.sql
-- =============================================================================
-- Postgres 15+ rejects `TIMESTAMPTZ - INTERVAL` in GENERATED columns
-- with error 42P17 ('generation expression is not immutable').
-- We replace the GENERATED column with a NOT NULL column + BEFORE INSERT
-- trigger that sets lock_at = scheduled_at - 10 minutes.
-- This preserves the invariant without depending on GENERATED semantics.
-- =============================================================================

-- Drop the GENERATED column (if it exists from a partial previous run)
ALTER TABLE public.matches DROP COLUMN IF EXISTS lock_at;

-- Re-add as a normal NOT NULL column with no default at this point
-- (the trigger will fill it on insert)
ALTER TABLE public.matches
  ADD COLUMN lock_at TIMESTAMPTZ;

-- Create the trigger function. We use (NEW.lock_at IS NULL) so that
-- explicit values (e.g., in tests or backfills) are respected.
CREATE OR REPLACE FUNCTION public.set_match_lock_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.lock_at IS NULL THEN
    NEW.lock_at := NEW.scheduled_at - INTERVAL '10 minutes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_matches_set_lock_at ON public.matches;
CREATE TRIGGER trg_matches_set_lock_at
  BEFORE INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_match_lock_at();

-- Backfill any existing rows (in case the previous run created the table
-- before this fix). This is safe to run multiple times.
UPDATE public.matches
SET lock_at = scheduled_at - INTERVAL '10 minutes'
WHERE lock_at IS NULL;

-- Now make it NOT NULL going forward
ALTER TABLE public.matches
  ALTER COLUMN lock_at SET NOT NULL;

-- Recreate the index (the old one was on a different column position
-- in the GENERATED version)
DROP INDEX IF EXISTS idx_matches_lock_pending;
CREATE INDEX idx_matches_lock_pending ON public.matches(lock_at) WHERE status = 'scheduled';

-- =============================================================================
-- End of fix
-- =============================================================================
