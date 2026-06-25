import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/infrastructure/supabase/server';
import { getGroup } from '@/application/groups/get-group';
import { PHASE_CODE_DESCRIPTIONS } from '@/lib/constants';
import type { StartingPhaseCode } from '@/domain/types';

export const metadata = { title: 'Grupo' };

export default async function GroupHomePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/grupos/${params.id}`);

  const group = await getGroup(params.id, user.id);
  if (!group) notFound();

  if (!group.isCurrentUserMember && !group.isCurrentUserAdmin) {
    redirect(`/unirse/${(group as { short_code?: string }).short_code ?? ''}`);
  }

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

      {group.participants.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Todavía no hay participantes.
        </p>
      ) : (
        <ol className="space-y-2">
          {group.participants
            .filter((p) => p.status === 'active')
            .map((p) => (
              <li
                key={p.id}
                className={`flex items-center justify-between rounded-xl border border-border bg-card p-3 ${
                  p.userId === user.id ? 'ring-2 ring-brand-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 text-center text-lg font-bold text-muted-foreground">
                    {p.position || '—'}
                  </span>
                  <span className="font-medium">{p.username}</span>
                </div>
                <span className="text-base font-semibold text-brand-600">{p.totalPoints} pts</span>
              </li>
            ))}
        </ol>
      )}

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
