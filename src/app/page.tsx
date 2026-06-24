export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight">
            Acabalo <span className="text-brand-500">Juez</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            La polla futbolera de tu grupo
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Próximamente: pronosticá, competí, gánale a tus amigos.
          </p>
        </div>
      </div>
    </main>
  );
}
