import { describe, it, expect } from 'vitest';
import { submitPredictionSchema } from '@/lib/predictions/zod-schemas';
import { MAX_GOALS_PER_SIDE, MIN_GOALS_PER_SIDE } from '@/lib/constants';

describe('submitPredictionSchema', () => {
  const validInput = {
    matchId: '00000000-0000-0000-0000-000000000001',
    groupId: '00000000-0000-0000-0000-000000000002',
    homeGoals: 2,
    awayGoals: 1,
  };

  it('accepts a valid prediction', () => {
    expect(submitPredictionSchema.safeParse(validInput).success).toBe(true);
  });

  it('accepts 0-0', () => {
    expect(submitPredictionSchema.safeParse({ ...validInput, homeGoals: 0, awayGoals: 0 }).success).toBe(true);
  });

  it('accepts boundary 20-20', () => {
    expect(
      submitPredictionSchema.safeParse({ ...validInput, homeGoals: 20, awayGoals: 20 }).success,
    ).toBe(true);
  });

  it('rejects negative goals', () => {
    expect(submitPredictionSchema.safeParse({ ...validInput, homeGoals: -1 }).success).toBe(false);
  });

  it('rejects goals > 20', () => {
    expect(submitPredictionSchema.safeParse({ ...validInput, homeGoals: 21 }).success).toBe(false);
  });

  it('rejects non-integer goals', () => {
    expect(submitPredictionSchema.safeParse({ ...validInput, homeGoals: 1.5 }).success).toBe(false);
  });

  it('rejects missing matchId', () => {
    const { matchId, ...rest } = validInput;
    expect(submitPredictionSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects non-UUID matchId', () => {
    expect(submitPredictionSchema.safeParse({ ...validInput, matchId: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects non-UUID groupId', () => {
    expect(submitPredictionSchema.safeParse({ ...validInput, groupId: 'not-a-uuid' }).success).toBe(false);
  });

  it('validates min goals constant', () => {
    expect(MIN_GOALS_PER_SIDE).toBe(0);
  });

  it('validates max goals constant', () => {
    expect(MAX_GOALS_PER_SIDE).toBe(20);
  });
});
