'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { recoverPasswordSchema, type RecoverPasswordInput } from '@/lib/auth/zod-schemas';
import { recoverPassword } from '@/application/auth/recover-password';

export function RecoveryForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecoverPasswordInput>({
    resolver: zodResolver(recoverPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = (data: RecoverPasswordInput) => {
    startTransition(async () => {
      await recoverPassword(data);
      setSubmitted(true);
    });
  };

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">Revisá tu email</h1>
        <p className="text-sm text-muted-foreground">
          Si el email existe, te enviamos un enlace de recuperación. El link expira en 1 hora.
        </p>
        <Link href="/login" className="inline-block text-sm text-brand-600 hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
      <p className="text-sm text-muted-foreground">
        Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.
      </p>
      <Input label="Email" type="email" autoComplete="email" autoFocus {...register('email')} error={errors.email?.message} />
      <Button type="submit" isLoading={isPending} className="w-full">
        Enviar enlace
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-brand-600 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}
