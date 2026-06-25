import { z } from 'zod';
import { COUNTRIES, TIMEZONES } from '@/lib/constants';

/**
 * Zod schemas for authentication flows.
 * Schemas are the source of truth — derive TS types with z.infer.
 */

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'El nombre es obligatorio')
      .max(50, 'Máximo 50 caracteres'),
    lastName: z
      .string()
      .min(1, 'El apellido es obligatorio')
      .max(50, 'Máximo 50 caracteres'),
    username: z
      .string()
      .min(3, 'Mínimo 3 caracteres')
      .max(30, 'Máximo 30 caracteres')
      .regex(/^[a-z0-9_]+$/, 'Solo letras minúsculas, números y guión bajo'),
    email: z.string().email('Email inválido'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Za-z]/, 'Debe contener al menos una letra')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirmPassword: z.string(),
    country: z.enum(COUNTRIES, {
      errorMap: () => ({ message: 'País no soportado' }),
    }),
    city: z
      .string()
      .min(1, 'La ciudad es obligatoria')
      .max(100, 'Máximo 100 caracteres'),
    timezone: z.enum(TIMEZONES, {
      errorMap: () => ({ message: 'Zona horaria inválida' }),
    }),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Debes aceptar los términos y condiciones' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Ingresá tu usuario o email')
    .max(100, 'Máximo 100 caracteres'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const recoverPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export type RecoverPasswordInput = z.infer<typeof recoverPasswordSchema>;
