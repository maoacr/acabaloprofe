import { describe, it, expect } from 'vitest';
import { generateShortCode, generateShortCodeWithRetry } from '@/domain/short-code';

describe('generateShortCode', () => {
  it('returns a 6-character string', () => {
    const code = generateShortCode();
    expect(code).toHaveLength(6);
  });

  it('uses only allowed alphabet (no 0, O, 1, I, L)', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateShortCode();
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it('returns uppercase only', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateShortCode();
      expect(code).toBe(code.toUpperCase());
    }
  });

  it('produces statistically unique values over 1000 calls', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateShortCode());
    }
    // With 30 chars alphabet and 6 positions = 30^6 = ~729M combinations.
    // 1000 calls should produce nearly 1000 unique. Allow for some collision noise.
    expect(codes.size).toBeGreaterThan(950);
  });
});

describe('generateShortCodeWithRetry', () => {
  it('returns a code not in the existing set', () => {
    const existing = new Set(['AAAAAA', 'BBBBBB']);
    const code = generateShortCodeWithRetry(existing);
    expect(existing.has(code)).toBe(false);
  });

  it('eventually returns a unique code (1000 calls, empty set)', () => {
    const existing = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const code = generateShortCodeWithRetry(existing);
      expect(existing.has(code)).toBe(false);
      existing.add(code);
    }
  });

  it('falls back to UUID-suffix when collisions exhaust retries', () => {
    // Mock Math.random to always return same value → same code
    const originalRandom = Math.random;
    let callCount = 0;
    Math.random = () => {
      callCount++;
      // Always return 0 → first char will be 'A' (index 0 of alphabet)
      return 0;
    };

    try {
      // Pre-fill so every attempt collides
      const existing = new Set<string>();
      // We need to know what code Math.random=0 will produce
      const expectedCollidingCode = 'AAAAAA';
      existing.add(expectedCollidingCode);

      const code = generateShortCodeWithRetry(existing, 5);
      // After 5 retries all collide, fallback should kick in
      // Fallback: take first 4 chars of last attempt + 2 chars from UUID
      expect(code).not.toBe(expectedCollidingCode);
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    } finally {
      Math.random = originalRandom;
      callCount = 0;
    }
  });
});
