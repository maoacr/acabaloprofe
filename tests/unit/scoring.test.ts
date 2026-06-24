import { describe, it, expect } from 'vitest';
import { calculatePoints, maxPointsForMatch, isDraw } from '@/domain/scoring';

describe('calculatePoints', () => {
  describe('group stage (isKnockout = false, multiplier = 1)', () => {
    it('pleno: 1:0 vs 1:0 → 10 pts (5+2+2+1)', () => {
      const r = calculatePoints({ home: 1, away: 0 }, { home: 1, away: 0 }, false);
      expect(r).toEqual({
        winnerPoints: 5,
        homeGoalsPoints: 2,
        awayGoalsPoints: 2,
        diffPoints: 1,
        totalPoints: 10,
      });
    });

    it('winner + diff only: 2:0 vs 3:1 → 6 pts (5+0+0+1)', () => {
      const r = calculatePoints({ home: 2, away: 0 }, { home: 3, away: 1 }, false);
      expect(r).toEqual({
        winnerPoints: 5,
        homeGoalsPoints: 0,
        awayGoalsPoints: 0,
        diffPoints: 1,
        totalPoints: 6,
      });
    });

    it('winner + diff: 2:1 vs 1:0 → 6 pts (5+0+0+1, same diff 1)', () => {
      const r = calculatePoints({ home: 2, away: 1 }, { home: 1, away: 0 }, false);
      expect(r).toEqual({
        winnerPoints: 5,
        homeGoalsPoints: 0,
        awayGoalsPoints: 0,
        diffPoints: 1,
        totalPoints: 6,
      });
    });

    it('draw correct: 0:0 vs 2:2 → 6 pts (5+0+0+1, draw winner + same diff 0)', () => {
      const r = calculatePoints({ home: 0, away: 0 }, { home: 2, away: 2 }, false);
      expect(r).toEqual({
        winnerPoints: 5,
        homeGoalsPoints: 0,
        awayGoalsPoints: 0,
        diffPoints: 1,
        totalPoints: 6,
      });
    });

    it('all wrong (but same diff): 1:2 vs 2:1 → 1 pt (0+0+0+1)', () => {
      // pred 1-2=-1 (away), actual 2-1=+1 (home). winner differs.
      // diff pred=1, actual=1. match. → 1 pt
      const r = calculatePoints({ home: 1, away: 2 }, { home: 2, away: 1 }, false);
      expect(r).toEqual({
        winnerPoints: 0,
        homeGoalsPoints: 0,
        awayGoalsPoints: 0,
        diffPoints: 1,
        totalPoints: 1,
      });
    });

    it('inverted winner (same diff): 3:0 vs 0:3 → 1 pt (0+0+0+1, diff 3 match)', () => {
      const r = calculatePoints({ home: 3, away: 0 }, { home: 0, away: 3 }, false);
      expect(r).toEqual({
        winnerPoints: 0,
        homeGoalsPoints: 0,
        awayGoalsPoints: 0,
        diffPoints: 1,
        totalPoints: 1,
      });
    });

    it('0-0 pleno: 0:0 vs 0:0 → 10 pts', () => {
      const r = calculatePoints({ home: 0, away: 0 }, { home: 0, away: 0 }, false);
      expect(r.totalPoints).toBe(10);
    });

    it('boundary 20-20: 20:20 vs 20:20 → 10 pts', () => {
      const r = calculatePoints({ home: 20, away: 20 }, { home: 20, away: 20 }, false);
      expect(r.totalPoints).toBe(10);
    });

    it('goals away only: 1:0 vs 2:0 → 7 pts (5 winner + 2 away goals, diff differs)', () => {
      // pred 1-0=+1, actual 2-0=+2. winner ✓. pred home=1 ≠ 2, pred away=0 == 0 ✓. diff 1 ≠ 2.
      const r = calculatePoints({ home: 1, away: 0 }, { home: 2, away: 0 }, false);
      expect(r).toEqual({
        winnerPoints: 5,
        homeGoalsPoints: 0,
        awayGoalsPoints: 2,
        diffPoints: 0,
        totalPoints: 7,
      });
    });

    it('away win with correct away goals: 1:2 vs 0:3 → 7 pts (5+0+2+0)', () => {
      // pred -1, actual -3. winner ✓. pred home=1 ≠ 0, pred away=2 ≠ 3. diff 1 ≠ 3.
      const r = calculatePoints({ home: 1, away: 2 }, { home: 0, away: 3 }, false);
      expect(r).toEqual({
        winnerPoints: 5,
        homeGoalsPoints: 0,
        awayGoalsPoints: 0,
        diffPoints: 0,
        totalPoints: 5,
      });
    });

    it('away win with correct diff: 0:2 vs 0:1 → 7 pts (5 winner + 2 home goals, away ≠)', () => {
      // pred -2, actual -1. winner ✓ (both away). pred home=0 == 0 ✓ (2 pts). pred away=2 ≠ 1. diff 2 ≠ 1.
      const r = calculatePoints({ home: 0, away: 2 }, { home: 0, away: 1 }, false);
      expect(r).toEqual({
        winnerPoints: 5,
        homeGoalsPoints: 2,
        awayGoalsPoints: 0,
        diffPoints: 0,
        totalPoints: 7,
      });
    });

    it('max points in group stage: 20:0 vs 20:0 → 10 pts', () => {
      const r = calculatePoints({ home: 20, away: 0 }, { home: 20, away: 0 }, false);
      expect(r.totalPoints).toBe(10);
    });
  });

  describe('knockout (isKnockout = true, multiplier = 2)', () => {
    it('pleno: 1:0 vs 1:0 → 20 pts (10+4+4+2)', () => {
      const r = calculatePoints({ home: 1, away: 0 }, { home: 1, away: 0 }, true);
      expect(r).toEqual({
        winnerPoints: 10,
        homeGoalsPoints: 4,
        awayGoalsPoints: 4,
        diffPoints: 2,
        totalPoints: 20,
      });
    });

    it('all wrong (but same diff): 1:0 vs 0:1 → 2 pts (0+0+0+2, diff 1 match)', () => {
      const r = calculatePoints({ home: 1, away: 0 }, { home: 0, away: 1 }, true);
      expect(r).toEqual({
        winnerPoints: 0,
        homeGoalsPoints: 0,
        awayGoalsPoints: 0,
        diffPoints: 2,
        totalPoints: 2,
      });
    });

    it('draw pleno: 2:2 vs 2:2 → 20 pts', () => {
      const r = calculatePoints({ home: 2, away: 2 }, { home: 2, away: 2 }, true);
      expect(r.totalPoints).toBe(20);
    });

    it('winner + diff: 2:1 vs 1:0 → 12 pts (10+0+0+2)', () => {
      const r = calculatePoints({ home: 2, away: 1 }, { home: 1, away: 0 }, true);
      expect(r).toEqual({
        winnerPoints: 10,
        homeGoalsPoints: 0,
        awayGoalsPoints: 0,
        diffPoints: 2,
        totalPoints: 12,
      });
    });
  });

  describe('maxPointsForMatch', () => {
    it('returns 10 for group stage', () => {
      expect(maxPointsForMatch(false)).toBe(10);
    });

    it('returns 20 for knockout', () => {
      expect(maxPointsForMatch(true)).toBe(20);
    });
  });

  describe('isDraw', () => {
    it('returns true when home equals away', () => {
      expect(isDraw({ home: 0, away: 0 })).toBe(true);
      expect(isDraw({ home: 3, away: 3 })).toBe(true);
    });

    it('returns false when home differs from away', () => {
      expect(isDraw({ home: 1, away: 0 })).toBe(false);
      expect(isDraw({ home: 0, away: 2 })).toBe(false);
    });
  });
});
