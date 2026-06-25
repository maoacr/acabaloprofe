'use client';

import { useCallback } from 'react';
import { MAX_GOALS_PER_SIDE, MIN_GOALS_PER_SIDE } from '@/lib/constants';

export interface GoalInputProps {
  homeGoals: number;
  awayGoals: number;
  onChange: (home: number, away: number) => void;
  disabled?: boolean;
  homeLabel?: string;
  awayLabel?: string;
}

/**
 * Touch-friendly goal input with +/- buttons and a center display.
 * Enforces 0-20 range. Designed for mobile-first (48px+ touch targets).
 */
export function GoalInput({
  homeGoals,
  awayGoals,
  onChange,
  disabled = false,
  homeLabel = 'Local',
  awayLabel = 'Visitante',
}: GoalInputProps) {
  const update = useCallback(
    (which: 'home' | 'away', delta: number) => {
      if (disabled) return;
      const current = which === 'home' ? homeGoals : awayGoals;
      const next = Math.max(MIN_GOALS_PER_SIDE, Math.min(MAX_GOALS_PER_SIDE, current + delta));
      if (next === current) return;
      if (which === 'home') onChange(next, awayGoals);
      else onChange(homeGoals, next);
    },
    [homeGoals, awayGoals, onChange, disabled],
  );

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="space-y-1.5 text-center">
        <p className="text-xs text-muted-foreground">{homeLabel}</p>
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => update('home', -1)}
            disabled={disabled || homeGoals <= MIN_GOALS_PER_SIDE}
            aria-label={`Restar gol a ${homeLabel}`}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-2xl font-bold hover:bg-muted disabled:opacity-30 touch-manipulation"
          >
            −
          </button>
          <span
            data-testid="home-goals"
            className="flex h-11 w-12 items-center justify-center text-2xl font-bold tabular-nums"
          >
            {homeGoals}
          </span>
          <button
            type="button"
            onClick={() => update('home', 1)}
            disabled={disabled || homeGoals >= MAX_GOALS_PER_SIDE}
            aria-label={`Sumar gol a ${homeLabel}`}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-2xl font-bold hover:bg-muted disabled:opacity-30 touch-manipulation"
          >
            +
          </button>
        </div>
      </div>

      <span className="text-2xl font-bold text-muted-foreground" aria-hidden="true">
        −
      </span>

      <div className="space-y-1.5 text-center">
        <p className="text-xs text-muted-foreground">{awayLabel}</p>
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => update('away', -1)}
            disabled={disabled || awayGoals <= MIN_GOALS_PER_SIDE}
            aria-label={`Restar gol a ${awayLabel}`}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-2xl font-bold hover:bg-muted disabled:opacity-30 touch-manipulation"
          >
            −
          </button>
          <span
            data-testid="away-goals"
            className="flex h-11 w-12 items-center justify-center text-2xl font-bold tabular-nums"
          >
            {awayGoals}
          </span>
          <button
            type="button"
            onClick={() => update('away', 1)}
            disabled={disabled || awayGoals >= MAX_GOALS_PER_SIDE}
            aria-label={`Sumar gol a ${awayLabel}`}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-2xl font-bold hover:bg-muted disabled:opacity-30 touch-manipulation"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
