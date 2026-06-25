import { z } from 'zod';
import { MAX_PARTICIPANTS_PER_GROUP } from '@/lib/constants';

/**
 * Zod schemas for group operations.
 */

export const startingPhaseSchema = z.enum(['ALL', 'FROM_ROUND_OF_16', 'FROM_SEMIFINALS', 'FINAL_ONLY']);

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(60, 'Máximo 60 caracteres'),
  description: z
    .string()
    .max(500, 'Máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  specialConditions: z
    .string()
    .max(1000, 'Máximo 1000 caracteres')
    .optional()
    .or(z.literal('')),
  tournamentId: z.string().uuid('Torneo inválido'),
  startingPhase: startingPhaseSchema,
  maxParticipants: z
    .number()
    .int()
    .min(2, 'Mínimo 2 participantes')
    .max(MAX_PARTICIPANTS_PER_GROUP, `Máximo ${MAX_PARTICIPANTS_PER_GROUP} participantes`)
    .default(MAX_PARTICIPANTS_PER_GROUP),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const joinGroupSchema = z.object({
  shortCode: z
    .string()
    .length(6, 'El código debe tener 6 caracteres')
    .regex(/^[A-Z0-9]{6}$/, 'Código inválido (solo mayúsculas y números)'),
});

export type JoinGroupInput = z.infer<typeof joinGroupSchema>;

export const leaveGroupSchema = z.object({
  groupId: z.string().uuid(),
});

export type LeaveGroupInput = z.infer<typeof leaveGroupSchema>;

export const manageParticipantSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(['active', 'inactive']),
});

export type ManageParticipantInput = z.infer<typeof manageParticipantSchema>;
