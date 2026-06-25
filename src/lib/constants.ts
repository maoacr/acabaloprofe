/**
 * Application-wide constants.
 *
 * - COUNTRIES: Supported countries for user registration.
 *   Must match the source list in the product spec (LATAM + US + ES).
 * - TIMEZONES: IANA timezones from GMT-12 to GMT+12, in Spanish context.
 * - MAX_PARTICIPANTS_PER_GROUP: Hard cap from product spec.
 * - PREDICTION_LOCK_MINUTES: How long before kickoff predictions close.
 * - MAX_GOALS_PER_SIDE: Validation range for goal predictions.
 */

import type { StartingPhaseCode } from '@/domain/types';

export const COUNTRIES = [
  'Argentina',
  'Bolivia',
  'Brasil',
  'Chile',
  'Colombia',
  'Costa Rica',
  'Ecuador',
  'El Salvador',
  'España',
  'Estados Unidos',
  'Guatemala',
  'Honduras',
  'México',
  'Nicaragua',
  'Panamá',
  'Paraguay',
  'Perú',
  'Puerto Rico',
  'Rep. Dominicana',
  'Uruguay',
  'Venezuela',
] as const;
export type Country = (typeof COUNTRIES)[number];

/**
 * IANA timezones from GMT-12 to GMT+12.
 * Includes major LATAM, US, ES zones plus UTC for completeness.
 */
export const TIMEZONES = [
  'Etc/GMT+12',
  'Etc/GMT+11',
  'Etc/GMT+10',
  'Etc/GMT+9',
  'Etc/GMT+8',
  'Etc/GMT+7',
  'Etc/GMT+6',
  'Etc/GMT+5',
  'Etc/GMT+4',
  'Etc/GMT+3',
  'Etc/GMT+2',
  'Etc/GMT+1',
  'UTC',
  'Etc/GMT-1',
  'Etc/GMT-2',
  'Etc/GMT-3',
  'America/Argentina/Buenos_Aires',
  'America/Sao_Paulo',
  'America/Bogota',
  'America/Lima',
  'America/Mexico_City',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/Madrid',
  'Africa/Johannesburg',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const;
export type Timezone = (typeof TIMEZONES)[number];

export const PHASE_CODE_DESCRIPTIONS: Record<StartingPhaseCode, string> = {
  ALL: 'Todos los partidos del torneo',
  FROM_ROUND_OF_16: 'Desde octavos de final',
  FROM_SEMIFINALS: 'Desde semifinales',
  FINAL_ONLY: 'Solo tercer puesto y final',
};

export const MAX_PARTICIPANTS_PER_GROUP = 100;
export const PREDICTION_LOCK_MINUTES = 10;
export const MAX_GOALS_PER_SIDE = 20;
export const MIN_GOALS_PER_SIDE = 0;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 30;
export const MIN_PASSWORD_LENGTH = 8;
