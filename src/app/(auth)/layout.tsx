import Link from 'next/link';

/**
 * Auth layout — centered card, no app nav.
 * Used by /login, /registro, /recuperar.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <Link href="/" className="mb-8 text-3xl font-bold tracking-tight">
        Acabalo <span className="text-brand-500">Profe</span>
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  );
}
