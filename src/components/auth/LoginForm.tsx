'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { loginSchema, type LoginInput } from '@/lib/auth/zod-schemas';
import { signIn } from '@/application/auth/login';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/dashboard';
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = (data: LoginInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await signIn(data);
      if (result.ok) {
        router.push(redirect);
        router.refresh();
      } else if (result.field) {
        setError(result.field as keyof LoginInput, { message: result.error });
      } else {
        setServerError(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>

      {serverError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <Input
        label="Usuario o email"
        autoComplete="username"
        autoFocus
        {...register('identifier')}
        error={errors.identifier?.message}
      />

      <Input
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        {...register('password')}
        error={errors.password?.message}
      />

      <Link
        href="/recuperar"
        className="block text-sm text-brand-600 hover:underline"
      >
        ¿Olvidaste tu contraseña?
      </Link>

      <Button type="submit" isLoading={isPending} className="w-full">
        Iniciar sesión
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{' '}
        <Link href="/registro" className="text-brand-600 hover:underline">
          Registrate
        </Link>
      </p>
    </form>
  );
}
