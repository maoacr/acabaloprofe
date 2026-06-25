'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onDismiss: () => void;
  durationMs?: number;
}

export function Toast({ message, type = 'info', onDismiss, durationMs = 4000 }: ToastProps) {
  useEffect(() => {
    const id = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(id);
  }, [onDismiss, durationMs]);

  const colorClass = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-foreground text-background',
  }[type];

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={cn(
        'fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-lg',
        colorClass,
      )}
    >
      {message}
    </div>
  );
}
