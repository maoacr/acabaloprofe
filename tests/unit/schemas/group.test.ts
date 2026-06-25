import { describe, it, expect } from 'vitest';
import { createGroupSchema, joinGroupSchema, leaveGroupSchema } from '@/lib/groups/zod-schemas';

describe('createGroupSchema', () => {
  const validInput = {
    name: 'La polla de la oficina',
    description: 'Para los almuerzos de los lunes',
    specialConditions: 'Premio: una pizza',
    tournamentId: '00000000-0000-0000-0000-000000000001',
    startingPhase: 'ALL' as const,
    maxParticipants: 50,
  };

  it('accepts a valid group', () => {
    expect(createGroupSchema.safeParse(validInput).success).toBe(true);
  });

  it('accepts a minimal group (only required fields)', () => {
    const minimal = {
      name: 'Polla amigos',
      tournamentId: '00000000-0000-0000-0000-000000000001',
      startingPhase: 'ALL' as const,
    };
    expect(createGroupSchema.safeParse(minimal).success).toBe(true);
  });

  it('rejects name shorter than 3 chars', () => {
    expect(createGroupSchema.safeParse({ ...validInput, name: 'ab' }).success).toBe(false);
  });

  it('rejects name longer than 60 chars', () => {
    expect(createGroupSchema.safeParse({ ...validInput, name: 'a'.repeat(61) }).success).toBe(false);
  });

  it('rejects description longer than 500 chars', () => {
    expect(createGroupSchema.safeParse({ ...validInput, description: 'a'.repeat(501) }).success).toBe(false);
  });

  it('rejects specialConditions longer than 1000 chars', () => {
    expect(createGroupSchema.safeParse({ ...validInput, specialConditions: 'a'.repeat(1001) }).success).toBe(false);
  });

  it('rejects invalid startingPhase', () => {
    expect(createGroupSchema.safeParse({ ...validInput, startingPhase: 'FROM_QUARTERS' }).success).toBe(false);
  });

  it('rejects maxParticipants < 2', () => {
    expect(createGroupSchema.safeParse({ ...validInput, maxParticipants: 1 }).success).toBe(false);
  });

  it('rejects maxParticipants > 100', () => {
    expect(createGroupSchema.safeParse({ ...validInput, maxParticipants: 101 }).success).toBe(false);
  });

  it('defaults maxParticipants to 100 when omitted', () => {
    const { maxParticipants, ...without } = validInput;
    const r = createGroupSchema.parse(without);
    expect(r.maxParticipants).toBe(100);
  });

  it('accepts all valid startingPhase values', () => {
    for (const sp of ['ALL', 'FROM_ROUND_OF_16', 'FROM_SEMIFINALS', 'FINAL_ONLY'] as const) {
      expect(createGroupSchema.safeParse({ ...validInput, startingPhase: sp }).success).toBe(true);
    }
  });
});

describe('joinGroupSchema', () => {
  it('accepts a 6-char short code', () => {
    expect(joinGroupSchema.safeParse({ shortCode: 'ABC123' }).success).toBe(true);
  });

  it('rejects short code with lowercase', () => {
    expect(joinGroupSchema.safeParse({ shortCode: 'abc123' }).success).toBe(false);
  });

  it('rejects short code shorter than 6 chars', () => {
    expect(joinGroupSchema.safeParse({ shortCode: 'ABC12' }).success).toBe(false);
  });

  it('rejects short code longer than 6 chars', () => {
    expect(joinGroupSchema.safeParse({ shortCode: 'ABC1234' }).success).toBe(false);
  });
});

describe('leaveGroupSchema', () => {
  it('accepts a valid UUID', () => {
    expect(leaveGroupSchema.safeParse({ groupId: '00000000-0000-0000-0000-000000000001' }).success).toBe(true);
  });

  it('rejects non-UUID', () => {
    expect(leaveGroupSchema.safeParse({ groupId: 'not-a-uuid' }).success).toBe(false);
  });
});
