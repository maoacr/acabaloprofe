import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';

export const metadata = { title: 'Mi perfil' };

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-2xl font-bold">Mi perfil</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Los datos del perfil son de solo lectura en esta versión.
      </p>

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between border-b border-border py-2">
          <dt className="text-muted-foreground">Usuario</dt>
          <dd className="font-medium">@{profile.username}</dd>
        </div>
        <div className="flex justify-between border-b border-border py-2">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium">{profile.email}</dd>
        </div>
        <div className="flex justify-between border-b border-border py-2">
          <dt className="text-muted-foreground">Nombre</dt>
          <dd className="font-medium">{profile.first_name} {profile.last_name}</dd>
        </div>
        <div className="flex justify-between border-b border-border py-2">
          <dt className="text-muted-foreground">País</dt>
          <dd className="font-medium">{profile.country}</dd>
        </div>
        <div className="flex justify-between border-b border-border py-2">
          <dt className="text-muted-foreground">Ciudad</dt>
          <dd className="font-medium">{profile.city}</dd>
        </div>
        <div className="flex justify-between border-b border-border py-2">
          <dt className="text-muted-foreground">Zona horaria</dt>
          <dd className="font-medium">{profile.timezone}</dd>
        </div>
      </dl>
    </div>
  );
}
