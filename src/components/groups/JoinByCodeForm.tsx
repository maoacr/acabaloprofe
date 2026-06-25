'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { joinGroup } from '@/application/groups/join-group';
import { joinGroupSchema } from '@/lib/groups/zod-schemas';

export function JoinByCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = joinGroupSchema.safeParse({ shortCode: code.toUpperCase() });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    startTransition(async () => {
      const result = await joinGroup({ shortCode: code.toUpperCase() });
      if (result.ok) {
        router.push(`/grupos/${result.data.groupId}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input
        label="Código de invitación"
        placeholder="ABC123"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={6}
        autoFocus
        error={error ?? undefined}
      />
      <Button type="submit" isLoading={isPending} className="w-full">Unirme</Button>
    </form>
  );
}
