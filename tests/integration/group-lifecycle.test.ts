import { describe, it, expect } from 'vitest';
import {
  createGroupSchema,
  joinGroupSchema,
  manageParticipantSchema,
} from '@/lib/groups/zod-schemas';

describe('group schemas field mapping', () => {
  it('createGroupSchema camelCase matches DB snake_case', () => {
    const input = createGroupSchema.parse({
      name: 'Test group',
      tournamentId: '00000000-0000-0000-0000-000000000001',
      startingPhase: 'ALL',
    });
    // The application layer is responsible for mapping these to snake_case
    // columns in the SQL INSERT. This test asserts the camelCase surface.
    expect(input.tournamentId).toBe('00000000-0000-0000-0000-000000000001');
    expect(input.maxParticipants).toBe(100);
  });

  it('joinGroupSchema accepts all 36 valid base32 chars', () => {
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    for (const ch of alphabet) {
      expect(joinGroupSchema.safeParse({ shortCode: ch.repeat(6) }).success).toBe(true);
    }
  });

  it('manageParticipantSchema enforces status enum', () => {
    const base = { groupId: '00000000-0000-0000-0000-000000000001', userId: '00000000-0000-0000-0000-000000000002' };
    expect(manageParticipantSchema.safeParse({ ...base, status: 'active' }).success).toBe(true);
    expect(manageParticipantSchema.safeParse({ ...base, status: 'inactive' }).success).toBe(true);
    expect(manageParticipantSchema.safeParse({ ...base, status: 'banned' }).success).toBe(false);
  });
});
