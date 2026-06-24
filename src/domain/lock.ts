import type { MatchStatus } from './types';

/**
 * Match lock helpers.
 *
 * A match is "locked" for predictions once `lock_at` (scheduled_at - 10 minutes)
 * has passed. Once locked, the RLS policy on `predictions` allows other
 * group participants to see the prediction. The scheduled `lock-predictions`
 * cron job is the source of truth for the `is_locked` column, but these
 * helpers provide defense-in-depth checks used by the application layer.
 */

/** True if the current time is at or past lockAt. */
export function isMatchLocked(lockAt: string): boolean {
  return new Date(lockAt).getTime() <= Date.now();
}

/** Milliseconds until lock (positive) or since lock (negative). */
export function timeUntilLockMs(lockAt: string): number {
  return new Date(lockAt).getTime() - Date.now();
}

/** True if a user can still submit a prediction for this match. */
export function isMatchOpen(status: MatchStatus, lockAt: string): boolean {
  if (status !== 'scheduled') return false;
  return !isMatchLocked(lockAt);
}
