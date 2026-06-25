import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  recoverPasswordSchema,
} from '@/lib/auth/zod-schemas';

describe('registerSchema', () => {
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

  it('accepts a valid registration', () => {
    const r = registerSchema.safeParse(validInput);
    expect(r.success).toBe(true);
  });

  it('rejects missing firstName', () => {
    const r = registerSchema.safeParse({ ...validInput, firstName: '' });
    expect(r.success).toBe(false);
  });

  it('rejects firstName longer than 50 chars', () => {
    const r = registerSchema.safeParse({ ...validInput, firstName: 'a'.repeat(51) });
    expect(r.success).toBe(false);
  });

  it('rejects username with uppercase letters', () => {
    const r = registerSchema.safeParse({ ...validInput, username: 'JuanPerez' });
    expect(r.success).toBe(false);
  });

  it('rejects username shorter than 3 chars', () => {
    const r = registerSchema.safeParse({ ...validInput, username: 'jp' });
    expect(r.success).toBe(false);
  });

  it('rejects username with special characters', () => {
    const r = registerSchema.safeParse({ ...validInput, username: 'juan-perez' });
    expect(r.success).toBe(false);
  });

  it('accepts username with underscore and digits', () => {
    const r = registerSchema.safeParse({ ...validInput, username: 'juan_perez_2026' });
    expect(r.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const r = registerSchema.safeParse({ ...validInput, email: 'not-an-email' });
    expect(r.success).toBe(false);
  });

  it('rejects password shorter than 8 chars', () => {
    const r = registerSchema.safeParse({ ...validInput, password: 'Pass1', confirmPassword: 'Pass1' });
    expect(r.success).toBe(false);
  });

  it('rejects password without letter', () => {
    const r = registerSchema.safeParse({ ...validInput, password: '12345678', confirmPassword: '12345678' });
    expect(r.success).toBe(false);
  });

  it('rejects password without number', () => {
    const r = registerSchema.safeParse({ ...validInput, password: 'PasswordOnly', confirmPassword: 'PasswordOnly' });
    expect(r.success).toBe(false);
  });

  it('rejects mismatched confirmPassword', () => {
    const r = registerSchema.safeParse({ ...validInput, confirmPassword: 'Different1' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const path = r.error.issues.find((i) => i.path.includes('confirmPassword'));
      expect(path).toBeDefined();
    }
  });

  it('rejects country not in the supported list', () => {
    const r = registerSchema.safeParse({ ...validInput, country: 'Wakanda' });
    expect(r.success).toBe(false);
  });

  it('rejects timezone not in the supported list', () => {
    const r = registerSchema.safeParse({ ...validInput, timezone: 'Mars/Olympus_Mons' });
    expect(r.success).toBe(false);
  });

  it('rejects acceptTerms = false', () => {
    const r = registerSchema.safeParse({ ...validInput, acceptTerms: false });
    expect(r.success).toBe(false);
  });

  it('rejects missing city', () => {
    const r = registerSchema.safeParse({ ...validInput, city: '' });
    expect(r.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid identifier + password', () => {
    expect(loginSchema.safeParse({ identifier: 'juanperez', password: 'Password1' }).success).toBe(true);
  });

  it('accepts email as identifier', () => {
    expect(loginSchema.safeParse({ identifier: 'juan@example.com', password: 'Password1' }).success).toBe(true);
  });

  it('rejects empty identifier', () => {
    expect(loginSchema.safeParse({ identifier: '', password: 'Password1' }).success).toBe(false);
  });

  it('rejects empty password', () => {
    expect(loginSchema.safeParse({ identifier: 'juan', password: '' }).success).toBe(false);
  });
});

describe('recoverPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(recoverPasswordSchema.safeParse({ email: 'juan@example.com' }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(recoverPasswordSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });
});
