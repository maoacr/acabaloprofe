'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { enterMatchResult } from '@/application/matches/enter-match-result';
import { cancelMatch } from '@/application/matches/cancel-match';

export interface ResultEntryFormProps {
  matchId: string;
  homeTeamShort: string;
  awayTeamShort: string;
  initialHome: number | null;
  initialAway: number | null;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
  isKnockout: boolean;
}

export function ResultEntryForm({
  matchId,
  homeTeamShort,
  awayTeamShort,
  initialHome,
  initialAway,
  status,
  isKnockout,
}: ResultEntryFormProps) {
  const router = useRouter();
  const [home, setHome] = useState(initialHome ?? 0);
  const [away, setAway] = useState(initialAway ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await enterMatchResult({ matchId, homeGoals: home, awayGoals: away });
      if (result.ok) {
        setSuccess(`Guardado. ${result.data.updatedPredictions} predicción(es) actualizadas.`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const onCancel = () => {
    if (!confirm('¿Cancelar este partido? Todos los pronósticos se pondrán en 0.')) return;
    startTransition(async () => {
      const result = await cancelMatch({ matchId });
      if (result.ok) {
        setSuccess('Partido cancelado.');
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const statusBadge = (() => {
    switch (status) {
      case 'finished': return { label: '✅ Finalizado', color: 'text-green-600' };
      case 'live': return { label: '🔴 En vivo', color: 'text-red-600' };
      case 'cancelled': return { label: '❌ Cancelado', color: 'text-gray-500' };
      default: return { label: '🟢 Pendiente', color: 'text-muted-foreground' };
    }
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold">
          {homeTeamShort} <span className="text-muted-foreground">vs</span> {awayTeamShort}
          {isKnockout && <span className="ml-2 text-xs uppercase text-accent-600">×2</span>}
        </p>
        <span className={`text-xs font-medium ${statusBadge.color}`}>{statusBadge.label}</span>
      </div>

      {status === 'cancelled' ? (
        <p className="text-sm text-muted-foreground">Este partido está cancelado.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground">{homeTeamShort}</label>
              <input
                type="number"
                min={0}
                max={20}
                value={home}
                onChange={(e) => setHome(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-center text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground">{awayTeamShort}</label>
              <input
                type="number"
                min={0}
                max={20}
                value={away}
                onChange={(e) => setAway(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-center text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600" role="status">{success}</p>
          )}

          <div className="flex gap-2">
            <Button onClick={submit} isLoading={isPending} className="flex-1">
              {status === 'finished' ? 'Actualizar resultado' : 'Marcar como finalizado'}
            </Button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-muted"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
