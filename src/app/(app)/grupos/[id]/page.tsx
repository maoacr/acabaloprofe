import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/infrastructure/supabase/server';
import { getGroup } from '@/application/groups/get-group';
import { getGroupLeaderboard } from '@/application/leaderboard/get-group-leaderboard';
import { PHASE_CODE_DESCRIPTIONS } from '@/lib/constants';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { Podium } from '@/components/leaderboard/Podium';
import type { StartingPhaseCode } from '@/domain/types';

export const metadata = { title: 'Grupo' };

export default async function GroupHomePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/grupos/${params.id}`);

  const [group, leaderboard] = await Promise.all([
    getGroup(params.id, user.id),
    getGroupLeaderboard(params.id),
  ]);

  if (!group) notFound();

  if (!group.isCurrentUserMember && !group.isCurrentUserAdmin) {
    redirect(`/unirse/${(group as { short_code?: string }).short_code ?? ''}`);
  }

  const top3 = leaderboard.slice(0, 3);
  const hasScores = leaderboard.some((e) => e.totalPoints > 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{group.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {PHASE_CODE_DESCRIPTIONS[group.startingPhase as StartingPhaseCode]}
        </p>
        {group.description && (
          <p className="mt-2 text-sm">{group.description}</p>
        )}
        {group.specialConditions && (
          <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
            <strong>Condiciones:</strong> {group.specialConditions}
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tabla de posiciones</h2>
        {group.isCurrentUserAdmin && (
          <Link href={`/grupos/${group.id}/admin`} className="text-sm text-brand-600 hover:underline">
            Panel de admin
          </Link>
        )}
      </div>

      {hasScores && top3.length >= 3 && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <Podium top3={top3} />
        </div>
      )}

      <LeaderboardTable entries={leaderboard} currentUserId={user.id} />

      <div className="mt-6 flex gap-2">
        <Link
          href={`/grupos/${group.id}/partidos`}
          className="flex-1 rounded-lg bg-brand-600 px-4 py-3 text-center font-medium text-white hover:bg-brand-700"
        >
          Hacer pronósticos
        </Link>
      </div>
    </div>
  );
}
