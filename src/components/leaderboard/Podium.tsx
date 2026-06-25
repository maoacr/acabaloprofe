import type { LeaderboardEntry } from '@/domain/types';

export interface PodiumProps {
  top3: LeaderboardEntry[];
}

/**
 * Animated podium for the top 3 of the leaderboard.
 * The 1st place card is in the center, 2nd to the left, 3rd to the right.
 */
export function Podium({ top3 }: PodiumProps) {
  const first = top3.find((e) => e.position === 1);
  const second = top3.find((e) => e.position === 2);
  const third = top3.find((e) => e.position === 3);

  if (!first) return null;

  return (
    <div className="grid grid-cols-3 items-end gap-2 py-4">
      {/* Second place */}
      <PodiumCard
        rank={2}
        username={second?.username ?? '—'}
        totalPoints={second?.totalPoints ?? 0}
        color="bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
        height="h-20"
      />
      {/* First place */}
      <PodiumCard
        rank={1}
        username={first.username}
        totalPoints={first.totalPoints}
        color="bg-yellow-300 text-yellow-900 dark:bg-yellow-600 dark:text-yellow-50"
        height="h-28"
        isWinner
      />
      {/* Third place */}
      <PodiumCard
        rank={3}
        username={third?.username ?? '—'}
        totalPoints={third?.totalPoints ?? 0}
        color="bg-orange-200 text-orange-900 dark:bg-orange-700 dark:text-orange-50"
        height="h-16"
      />
    </div>
  );
}

function PodiumCard({
  rank,
  username,
  totalPoints,
  color,
  height,
  isWinner = false,
}: {
  rank: number;
  username: string;
  totalPoints: number;
  color: string;
  height: string;
  isWinner?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className={isWinner ? 'text-sm font-bold' : 'text-xs font-medium'}>{username}</p>
      <p className={`text-xs ${isWinner ? 'font-bold' : 'text-muted-foreground'}`}>{totalPoints} pts</p>
      <div
        className={`mt-2 flex w-full ${height} items-center justify-center rounded-t-lg ${color} text-2xl font-bold transition-transform hover:scale-105`}
      >
        {rank}
      </div>
    </div>
  );
}
