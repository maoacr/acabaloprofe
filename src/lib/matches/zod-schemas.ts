import { z } from 'zod';
import { MIN_GOALS_PER_SIDE, MAX_GOALS_PER_SIDE } from '@/lib/constants';

export const enterMatchResultSchema = z.object({
  matchId: z.string().uuid('Partido inválido'),
  homeGoals: z
    .number()
    .int()
    .min(MIN_GOALS_PER_SIDE, `Los goles deben ser entre ${MIN_GOALS_PER_SIDE} y ${MAX_GOALS_PER_SIDE}`)
    .max(MAX_GOALS_PER_SIDE, `Los goles deben ser entre ${MIN_GOALS_PER_SIDE} y ${MAX_GOALS_PER_SIDE}`),
  awayGoals: z
    .number()
    .int()
    .min(MIN_GOALS_PER_SIDE, `Los goles deben ser entre ${MIN_GOALS_PER_SIDE} y ${MAX_GOALS_PER_SIDE}`)
    .max(MAX_GOALS_PER_SIDE, `Los goles deben ser entre ${MIN_GOALS_PER_SIDE} y ${MAX_GOALS_PER_SIDE}`),
});

export type EnterMatchResultInput = z.infer<typeof enterMatchResultSchema>;

export const cancelMatchSchema = z.object({
  matchId: z.string().uuid('Partido inválido'),
});

export type CancelMatchInput = z.infer<typeof cancelMatchSchema>;
