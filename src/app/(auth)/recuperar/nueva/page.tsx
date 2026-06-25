'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/infrastructure/supabase/client';

const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Za-z]/, 'Debe contener al menos una letra')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type SetPasswordInput = z.infer<typeof setPasswordSchema>;

export default function SetNewPasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = (data: SetPasswordInput) => {
    setServerError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) {
        setServerError(error.message);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <h1 className="text-2xl font-bold">Nueva contraseña</h1>
      {serverError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}
      <Input label="Nueva contraseña" type="password" autoComplete="new-password" {...register('password')} error={errors.password?.message} />
      <Input label="Confirmar contraseña" type="password" autoComplete="new-password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
      <Button type="submit" isLoading={isPending} className="w-full">
        Guardar contraseña
      </Button>
    </form>
  );
}
