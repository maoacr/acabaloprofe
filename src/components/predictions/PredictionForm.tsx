'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { GoalInput } from '@/components/forms/GoalInput';
import { submitPrediction } from '@/application/predictions/submit-prediction';

export interface PredictionFormProps {
  matchId: string;
  groupId: string;
  homeTeamName: string;
  awayTeamName: string;
  initialHome: number;
  initialAway: number;
  isLocked: boolean;
  lockAt: string;
  scheduledAt: string;
}

const DEBOUNCE_MS = 800;

/**
 * Auto-saving prediction form.
 * - Debounces changes by 800ms
 * - Calls submitPrediction Server Action
 * - Shows "Guardado" indicator on success
 * - Vibrates on haptic-capable devices when save succeeds
 * - Disables input when match is locked
 */
export function PredictionForm({
  matchId,
  groupId,
  homeTeamName,
  awayTeamName,
  initialHome,
  initialAway,
  isLocked,
}: PredictionFormProps) {
  const [home, setHome] = useState(initialHome);
  const [away, setAway] = useState(initialAway);
  const [savedAt, setSavedAt] = useState<Date | null>(
    initialHome >= 0 && initialAway >= 0 ? new Date() : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save with debounce
  useEffect(() => {
    if (isLocked) return;
    if (home === initialHome && away === initialAway) return; // no change

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await submitPrediction({ matchId, groupId, homeGoals: home, awayGoals: away });
        if (result.ok) {
          setSavedAt(new Date());
          setError(null);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
          }
        } else {
          setError(result.error);
        }
      });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home, away, isLocked]);

  return (
    <div className="space-y-3">
      <GoalInput
        homeGoals={home}
        awayGoals={away}
        onChange={(h, a) => {
          setHome(h);
          setAway(a);
        }}
        disabled={isLocked}
        homeLabel={homeTeamName}
        awayLabel={awayTeamName}
      />

      <div className="flex items-center justify-between text-xs" aria-live="polite">
        <span className="text-muted-foreground">
          {isLocked
            ? '🔒 Bloqueado'
            : isPending
              ? 'Guardando…'
              : savedAt
                ? '✓ Guardado'
                : 'Sin guardar'}
        </span>
        {error && <span className="text-red-600">{error}</span>}
      </div>
    </div>
  );
}
