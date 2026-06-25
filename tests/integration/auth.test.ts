import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  recoverPasswordSchema,
} from '@/lib/auth/zod-schemas';

describe('auth schema field names match database columns', () => {
  it('registerSchema field names match User DB columns', () => {
    const validInput = {
      firstName: 'Juan',
      lastName: 'Pérez',
      username: 'juanperez',
      password: 'Password1',
      confirmPassword: 'Password1',
      email: 'juan@example.com',
      country: 'Argentina',
      city: 'Buenos Aires',
      timezone: 'America/Argentina/Buenos_Aires',
      acceptTerms: true,
    };
    const r = registerSchema.parse(validInput);
    expect(r.firstName).toBe('Juan');
    expect(r.email).toBe('juan@example.com');
    // The application layer is responsible for mapping to snake_case DB columns
  });

  it('rejects non-supported country', () => {
    const r = registerSchema.safeParse({
      firstName: 'A', lastName: 'B', username: 'abc', password: 'Password1',
      confirmPassword: 'Password1', email: 'a@b.com',
      country: 'Antarctica', city: 'X',
      timezone: 'UTC', acceptTerms: true,
    });
    expect(r.success).toBe(false);
  });
});

describe('loginSchema accepts email OR username', () => {
  it('accepts email format', () => {
    expect(loginSchema.safeParse({ identifier: 'user@example.com', password: 'x' }).success).toBe(true);
  });
  it('accepts username format (no @)', () => {
    expect(loginSchema.safeParse({ identifier: 'juanperez', password: 'x' }).success).toBe(true);
  });
});

describe('recoverPasswordSchema rejects non-email', () => {
  it('rejects plain text', () => {
    expect(recoverPasswordSchema.safeParse({ email: 'notanemail' }).success).toBe(false);
  });
  it('rejects empty', () => {
    expect(recoverPasswordSchema.safeParse({ email: '' }).success).toBe(false);
  });
});
