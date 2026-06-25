import { LeaderboardRow } from './LeaderboardRow';
import type { LeaderboardEntry } from '@/domain/types';

export interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

export function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Todavía no hay participantes activos.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {entries.map((e) => (
        <LeaderboardRow
          key={e.userId}
          position={e.position}
          username={e.username}
          totalPoints={e.totalPoints}
          matchesPlayed={e.matchesPlayed}
          perfectScores={e.perfectScores}
          isCurrentUser={e.userId === currentUserId}
          joinedAt={e.joinedAt}
        />
      ))}
    </ol>
  );
}
