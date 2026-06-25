'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { COUNTRIES, TIMEZONES } from '@/lib/constants';
import { registerSchema, type RegisterInput } from '@/lib/auth/zod-schemas';
import { registerUser } from '@/application/auth/register';

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      country: undefined,
      city: '',
      timezone: undefined,
      acceptTerms: false as unknown as true,
    },
  });

  const onSubmit = (data: RegisterInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await registerUser(data);
      if (result.ok) {
        router.push('/dashboard');
        router.refresh();
      } else if (result.field) {
        setError(result.field as keyof RegisterInput, { message: result.error });
      } else {
        setServerError(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <h1 className="text-2xl font-bold">Crear cuenta</h1>

      {serverError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input label="Nombre" autoComplete="given-name" {...register('firstName')} error={errors.firstName?.message} />
        <Input label="Apellido" autoComplete="family-name" {...register('lastName')} error={errors.lastName?.message} />
      </div>

      <Input
        label="Nombre de usuario"
        autoComplete="username"
        hint="3-30 caracteres, minúsculas, números y guión bajo"
        {...register('username')}
        error={errors.username?.message}
      />

      <Input label="Email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />

      <Input
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        hint="Mínimo 8 caracteres, con letra y número"
        {...register('password')}
        error={errors.password?.message}
      />

      <Input
        label="Confirmar contraseña"
        type="password"
        autoComplete="new-password"
        {...register('confirmPassword')}
        error={errors.confirmPassword?.message}
      />

      <div className="space-y-1.5">
        <label htmlFor="country" className="block text-sm font-medium">País</label>
        <select
          id="country"
          className="block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register('country')}
          aria-invalid={errors.country ? 'true' : undefined}
        >
          <option value="">Seleccioná tu país</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {errors.country && <p className="text-sm text-red-600" role="alert">{errors.country.message}</p>}
      </div>

      <Input label="Ciudad" autoComplete="address-level2" {...register('city')} error={errors.city?.message} />

      <div className="space-y-1.5">
        <label htmlFor="timezone" className="block text-sm font-medium">Zona horaria</label>
        <select
          id="timezone"
          className="block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register('timezone')}
          aria-invalid={errors.timezone ? 'true' : undefined}
        >
          <option value="">Seleccioná tu zona horaria</option>
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
        {errors.timezone && <p className="text-sm text-red-600" role="alert">{errors.timezone.message}</p>}
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 rounded border-input"
          {...register('acceptTerms')}
        />
        <span>
          Acepto los{' '}
          <Link href="/terminos" className="text-brand-600 hover:underline">
            términos y condiciones
          </Link>
        </span>
      </label>
      {errors.acceptTerms && <p className="text-sm text-red-600" role="alert">{errors.acceptTerms.message}</p>}

      <Button type="submit" isLoading={isPending} className="w-full">
        Crear cuenta
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="text-brand-600 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
