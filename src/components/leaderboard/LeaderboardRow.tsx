import { cn } from '@/lib/utils';

export interface LeaderboardRowProps {
  position: number;
  username: string;
  totalPoints: number;
  matchesPlayed: number;
  perfectScores: number;
  isCurrentUser: boolean;
  joinedAt: string;
}

export function LeaderboardRow({
  position,
  username,
  totalPoints,
  matchesPlayed,
  perfectScores,
  isCurrentUser,
}: LeaderboardRowProps) {
  return (
    <li
      className={cn(
        'flex items-center justify-between rounded-xl border border-border bg-card p-3 transition-colors',
        isCurrentUser && 'sticky top-14 z-[1] ring-2 ring-brand-500 shadow-sm',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
            position === 1 && 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100',
            position === 2 && 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100',
            position === 3 && 'bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100',
            position > 3 && 'bg-muted text-muted-foreground',
            position === 0 && 'bg-muted text-muted-foreground',
          )}
        >
          {position || '—'}
        </span>
        <div className="min-w-0">
          <p className={cn('truncate font-medium', isCurrentUser && 'text-brand-700 dark:text-brand-300')}>
            {username}
            {isCurrentUser && <span className="ml-1 text-xs">(vos)</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {matchesPlayed} partido{matchesPlayed === 1 ? '' : 's'}
            {perfectScores > 0 && ` · ${perfectScores} pleno${perfectScores === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>
      <span className="text-base font-bold tabular-nums text-brand-600">{totalPoints} pts</span>
    </li>
  );
}
