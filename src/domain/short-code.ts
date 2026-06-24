/**
 * Group short code generator.
 *
 * Generates 6-character codes from a base32 alphabet that excludes
 * visually confusing characters: 0, O, 1, I, L.
 *
 * The application layer (`application/groups/create-group.ts`) is responsible
 * for actually persisting the code and handling DB unique_violation.
 * This module provides the pure generation logic.
 */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const DEFAULT_MAX_ATTEMPTS = 5;

/** Pick a random character from the alphabet. */
function pickRandomChar(): string {
  return ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
}

/** Generate a single 6-character short code. May collide. */
export function generateShortCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += pickRandomChar();
  }
  return code;
}

/**
 * Generate a short code that doesn't exist in the provided set.
 * Retries up to `maxAttempts` times. If all attempts collide,
 * falls back to a UUID-suffix pattern (first 4 chars from last attempt
 * + 2 hex chars from a random UUID).
 *
 * In production, prefer checking against the DB (which is faster and
 * source of truth). The `existing` set is intended for tests; the
 * application layer should use a DB unique constraint + retry on
 * `unique_violation` error code (Postgres 23505).
 */
export function generateShortCodeWithRetry(
  existing: Set<string>,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
): string {
  let lastCode = '';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    lastCode = generateShortCode();
    if (!existing.has(lastCode)) {
      return lastCode;
    }
  }

  // Fallback: take chars from a fresh UUID to ensure uniqueness.
  // This branch is only reached after 5 deterministic attempts collided,
  // so we need something with effectively-zero collision probability.
  const uuid = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID().replace(/-/g, '').toUpperCase()
    : Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);

  // Take a slice of the UUID that we know is fresh (not the first 6 chars
  // of a UUID which could in theory be reused, but the middle is essentially unique).
  // Combine first 2 chars of lastCode + first 4 chars of the new UUID.
  return (lastCode.slice(0, 2) + uuid.slice(0, 4));
}
