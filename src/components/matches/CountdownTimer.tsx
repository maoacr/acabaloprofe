'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface CountdownProps {
  targetIso: string;
  className?: string;
  onComplete?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calcTimeLeft(target: number): TimeLeft {
  const total = target - Date.now();
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  return {
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total % 86_400_000) / 3_600_000),
    minutes: Math.floor((total % 3_600_000) / 60_000),
    seconds: Math.floor((total % 60_000) / 1000),
    total,
  };
}

/**
 * Live countdown to a target ISO timestamp.
 * Color: green (>24h), yellow (<24h), red (<1h).
 * Vibrates when reaching 0.
 */
export function Countdown({ targetIso, className, onComplete }: CountdownProps) {
  const target = new Date(targetIso).getTime();
  const [time, setTime] = useState<TimeLeft>(() => calcTimeLeft(target));

  useEffect(() => {
    if (time.total <= 0) {
      onComplete?.();
      return;
    }
    const id = setInterval(() => {
      const next = calcTimeLeft(target);
      setTime(next);
      if (next.total <= 0) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        onComplete?.();
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const colorClass =
    time.total <= 0
      ? 'text-muted-foreground'
      : time.total < 3_600_000
        ? 'text-red-600'
        : time.total < 86_400_000
          ? 'text-amber-600'
          : 'text-brand-600';

  const label =
    time.total <= 0
      ? 'Cerrado'
      : time.days > 0
        ? `${time.days}d ${time.hours}h ${time.minutes}m`
        : time.hours > 0
          ? `${time.hours}h ${time.minutes}m ${time.seconds}s`
          : `${time.minutes}:${String(time.seconds).padStart(2, '0')}`;

  return (
    <span
      className={cn('font-mono text-sm tabular-nums', colorClass, className)}
      aria-live="polite"
      aria-label={`Tiempo restante: ${label}`}
    >
      {label}
    </span>
  );
}
