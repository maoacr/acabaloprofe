import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { getGroupMatches } from '@/application/matches/get-group-matches';
import { ResultEntryForm } from '@/components/admin/ResultEntryForm';

export const metadata = { title: 'Resultados (admin)' };

export default async function AdminResultsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/admin/resultados');

  const { data: profile } = await supabase
    .from('users')
    .select('is_system_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_system_admin) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="text-xl font-bold">Sin permisos</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta sección es solo para administradores del sistema.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  // Get the demo tournament
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('slug', 'mundial-demo-2026')
    .single();

  if (!tournament) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">Torneo no encontrado. Aplicá las migrations.</p>
      </div>
    );
  }

  const matches = await getGroupMatches(tournament.id, 'ALL', true);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resultados de partidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingresá los resultados de los partidos finalizados. Los puntos se calculan automáticamente.
        </p>
      </div>

      {matches.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No hay partidos para mostrar.
        </p>
      ) : (
        <ul className="space-y-3">
          {matches.map((m) => (
            <li key={m.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">{m.phaseName} · {m.matchday}</span>
                <span className="text-muted-foreground">
                  {new Date(m.scheduledAt).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
              <ResultEntryForm
                matchId={m.id}
                homeTeamShort={m.homeTeam.shortName}
                awayTeamShort={m.awayTeam.shortName}
                initialHome={m.homeGoals}
                initialAway={m.awayGoals}
                status={m.status}
                isKnockout={m.isKnockout}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
