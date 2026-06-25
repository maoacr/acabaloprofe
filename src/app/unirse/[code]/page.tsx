import { createClient } from '@/infrastructure/supabase/server';
import { PHASE_CODE_DESCRIPTIONS } from '@/lib/constants';
import { JoinByCodeForm } from '@/components/groups/JoinByCodeForm';
import type { StartingPhaseCode } from '@/domain/types';

export const metadata = { title: 'Unirse a un grupo' };

export default async function JoinPage({ params }: { params: { code: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc('get_group_for_invite', {
    p_short_code: params.code.toUpperCase(),
  });

  const group = data && data.length > 0 ? data[0] : null;

  if (error || !group) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="text-xl font-bold">Grupo no encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">El código {params.code} no es válido.</p>
      </div>
    );
  }

  const activeCount = typeof group.active_participants === 'string'
    ? parseInt(group.active_participants, 10)
    : Number(group.active_participants);

  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{group.group_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {PHASE_CODE_DESCRIPTIONS[group.starting_phase as StartingPhaseCode]}
        </p>
        {group.description && <p className="mt-3 text-sm">{group.description}</p>}
        {group.special_conditions && (
          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            <strong>Condiciones:</strong> {group.special_conditions}
          </div>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          {activeCount} de {group.max_participants} participantes
        </p>
      </div>

      {user ? (
        <JoinByCodeForm />
      ) : (
        <div className="space-y-3">
          <a
            href={`/login?redirect=/unirse/${params.code}`}
            className="block w-full rounded-lg bg-brand-600 px-4 py-3 text-center font-medium text-white hover:bg-brand-700"
          >
            Iniciar sesión para unirme
          </a>
          <a
            href={`/registro?redirect=/unirse/${params.code}`}
            className="block w-full rounded-lg border border-border bg-card px-4 py-3 text-center font-medium hover:bg-muted"
          >
            Crear cuenta
          </a>
        </div>
      )}
    </div>
  );
}
