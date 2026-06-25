import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { getGroup } from '@/application/groups/get-group';

export const metadata = { title: 'Admin del grupo' };

export default async function GroupAdminPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/grupos/${params.id}/admin`);

  const group = await getGroup(params.id, user.id);
  if (!group) notFound();

  if (!group.isCurrentUserAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="text-xl font-bold">Sin permisos</h1>
        <p className="mt-2 text-sm text-muted-foreground">Solo el administrador puede acceder a este panel.</p>
      </div>
    );
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/unirse/${(group as { short_code?: string }).short_code ?? ''}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Panel de admin</h1>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Enlace de invitación</h2>
        <div className="rounded-lg border border-border bg-muted/50 p-3 font-mono text-sm break-all">
          {inviteUrl}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Compartí este enlace por WhatsApp, email o como quieras.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Participantes</h2>
        <ul className="space-y-2">
          {group.participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
            >
              <div>
                <p className="font-medium">{p.username}</p>
                <p className="text-xs text-muted-foreground">
                  {p.totalPoints} pts · Posición #{p.position || '—'}
                  {p.status === 'inactive' && ' · Inactivo'}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Toggle de activar/inactivar disponible en una próxima versión.
        </p>
      </section>
    </div>
  );
}
