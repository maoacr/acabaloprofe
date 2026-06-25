import Link from 'next/link';
import { createClient } from '@/infrastructure/supabase/server';
import { Button } from '@/components/ui/Button';
import { JoinByCodeForm } from '@/components/groups/JoinByCodeForm';
import { Trophy, Users, Target, Zap } from 'lucide-react';

export const metadata = { title: 'Acabalo Profe · La polla futbolera' };

const STEPS = [
  {
    icon: Trophy,
    title: 'Elegí un torneo',
    description: 'Mundial, Copa América, Champions o tu liga local. Vos decidís.',
  },
  {
    icon: Users,
    title: 'Armá tu grupo',
    description: 'Invitá amigos con un link. Hasta 100 participantes por grupo.',
  },
  {
    icon: Target,
    title: 'Hacé tus pronósticos',
    description: 'Marcador exacto antes de cada partido. Cierra 10 min antes del pitazo.',
  },
  {
    icon: Zap,
    title: 'Sumá puntos',
    description: 'Ganador, goles y diferencia. Knockouts valen doble. Sin apuestas, puro fútbol.',
  },
];

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <header className="border-b border-border bg-gradient-to-b from-brand-50 to-background px-6 py-12 dark:from-brand-950 dark:to-background">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Acabalo Profe</p>
          <h1 className="mt-2 text-5xl font-extrabold tracking-tight sm:text-6xl">
            La polla futbolera
            <br />
            <span className="text-brand-500">de tu grupo</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Pronosticá, competí, gánale a tus amigos. Gratis, sin apuestas, puro fútbol.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {user ? (
              <Link href="/grupos/nuevo">
                <Button size="lg" className="w-full sm:w-auto">+ Crear mi polla</Button>
              </Link>
            ) : (
              <Link href="/registro?redirect=/grupos/nuevo">
                <Button size="lg" className="w-full sm:w-auto">+ Crear mi polla gratis</Button>
              </Link>
            )}
            {user ? (
              <Link href="/grupos">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">Ir a mis grupos</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">Ya tengo cuenta</Button>
              </Link>
            )}
          </div>

          {!user && (
            <p className="mt-4 text-sm text-muted-foreground">
              ¿Tenés un código de invitación? Pegalo acá abajo 👇
            </p>
          )}
        </div>

        {!user && (
          <div className="mx-auto mt-6 max-w-sm">
            <JoinByCodeForm />
          </div>
        )}
      </header>

      {/* How it works */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-bold">Cómo funciona</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                    {i + 1}
                  </span>
                  <step.icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
                </div>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust + disclaimer */}
      <section className="border-t border-border bg-muted/30 px-6 py-10">
        <div className="mx-auto max-w-2xl text-center text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">100% gratis y sin apuestas.</strong> Solo entretenimiento entre amigos.
          </p>
          <p className="mt-2 text-xs">
            No manejamos dinero real. Los puntos son solo para competir.
          </p>
        </div>
      </section>
    </div>
  );
}
