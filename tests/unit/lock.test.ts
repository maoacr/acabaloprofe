import { describe, it, expect } from 'vitest';
import { isMatchLocked, timeUntilLockMs, isMatchOpen } from '@/domain/lock';

describe('isMatchLocked', () => {
  it('returns true when lockAt is in the past', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isMatchLocked(past)).toBe(true);
  });

  it('returns false when lockAt is in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isMatchLocked(future)).toBe(false);
  });

  it('returns true when lockAt equals now (boundary, treats past-or-equal as locked)', () => {
    const now = new Date().toISOString();
    expect(isMatchLocked(now)).toBe(true);
  });
});

describe('timeUntilLockMs', () => {
  it('returns positive ms when lockAt is in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const ms = timeUntilLockMs(future);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(60_000);
  });

  it('returns negative ms when lockAt is in the past', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(timeUntilLockMs(past)).toBeLessThan(0);
  });
});

describe('isMatchOpen', () => {
  it('returns true when match is scheduled and not past lockAt', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isMatchOpen('scheduled', future)).toBe(true);
  });

  it('returns false when match status is finished', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isMatchOpen('finished', future)).toBe(false);
  });

  it('returns false when match status is cancelled', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isMatchOpen('cancelled', future)).toBe(false);
  });

  it('returns false when match is scheduled but past lockAt', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isMatchOpen('scheduled', past)).toBe(false);
  });

  it('returns false when match is live', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isMatchOpen('live', future)).toBe(false);
  });
});
