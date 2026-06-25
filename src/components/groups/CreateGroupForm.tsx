'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createGroupSchema, type CreateGroupInput } from '@/lib/groups/zod-schemas';
import { createGroup } from '@/application/groups/create-group';

export function CreateGroupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      description: '',
      specialConditions: '',
      startingPhase: 'ALL',
      maxParticipants: 100,
    },
  });

  const onSubmit = (data: CreateGroupInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createGroup(data);
      if (result.ok) {
        router.push(`/grupos/${result.data.groupId}`);
        router.refresh();
      } else if (result.field) {
        setError(result.field as keyof CreateGroupInput, { message: result.error });
      } else {
        setServerError(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <h1 className="text-2xl font-bold">Crear grupo</h1>

      {serverError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <Input label="Nombre del grupo" {...register('name')} error={errors.name?.message} />

      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium">Descripción (opcional)</label>
        <textarea
          id="description"
          rows={3}
          className="block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register('description')}
          aria-invalid={errors.description ? 'true' : undefined}
        />
        {errors.description && <p className="text-sm text-red-600" role="alert">{errors.description.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="specialConditions" className="block text-sm font-medium">Condiciones especiales (opcional)</label>
        <textarea
          id="specialConditions"
          rows={2}
          className="block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Ej: desempate por mayor número de plenos"
          {...register('specialConditions')}
          aria-invalid={errors.specialConditions ? 'true' : undefined}
        />
        {errors.specialConditions && <p className="text-sm text-red-600" role="alert">{errors.specialConditions.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tournamentId" className="block text-sm font-medium">Torneo</label>
        <select
          id="tournamentId"
          className="block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register('tournamentId')}
          aria-invalid={errors.tournamentId ? 'true' : undefined}
        >
          <option value="">Seleccioná un torneo</option>
          <option value="00000000-0000-0000-0000-000000000001">Mundial Demo 2026</option>
        </select>
        {errors.tournamentId && <p className="text-sm text-red-600" role="alert">{errors.tournamentId.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="startingPhase" className="block text-sm font-medium">Fase de inicio</label>
        <select
          id="startingPhase"
          className="block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register('startingPhase')}
        >
          <option value="ALL">Todos los partidos del torneo</option>
          <option value="FROM_ROUND_OF_16">Desde octavos de final</option>
          <option value="FROM_SEMIFINALS">Desde semifinales</option>
          <option value="FINAL_ONLY">Solo final y tercer puesto</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="maxParticipants" className="block text-sm font-medium">Máximo de participantes</label>
        <input
          id="maxParticipants"
          type="number"
          min={2}
          max={100}
          className="block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register('maxParticipants', { valueAsNumber: true })}
        />
        {errors.maxParticipants && <p className="text-sm text-red-600" role="alert">{errors.maxParticipants.message}</p>}
      </div>

      <Button type="submit" isLoading={isPending} className="w-full">Crear grupo</Button>
    </form>
  );
}
