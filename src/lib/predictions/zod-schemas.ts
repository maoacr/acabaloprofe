import { z } from 'zod';
import { MAX_GOALS_PER_SIDE, MIN_GOALS_PER_SIDE } from '@/lib/constants';

export const submitPredictionSchema = z.object({
  matchId: z.string().uuid('Partido inválido'),
  groupId: z.string().uuid('Grupo inválido'),
  homeGoals: z
    .number()
    .int('Los goles deben ser un número entero')
    .min(MIN_GOALS_PER_SIDE, `Los goles deben ser entre ${MIN_GOALS_PER_SIDE} y ${MAX_GOALS_PER_SIDE}`)
    .max(MAX_GOALS_PER_SIDE, `Los goles deben ser entre ${MIN_GOALS_PER_SIDE} y ${MAX_GOALS_PER_SIDE}`),
  awayGoals: z
    .number()
    .int('Los goles deben ser un número entero')
    .min(MIN_GOALS_PER_SIDE, `Los goles deben ser entre ${MIN_GOALS_PER_SIDE} y ${MAX_GOALS_PER_SIDE}`)
    .max(MAX_GOALS_PER_SIDE, `Los goles deben ser entre ${MIN_GOALS_PER_SIDE} y ${MAX_GOALS_PER_SIDE}`),
});

export type SubmitPredictionInput = z.infer<typeof submitPredictionSchema>;
