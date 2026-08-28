import { describe, expect, it } from 'vitest';
import { MAX_BONUS, calculateXpMultiplier } from './multipliers';

const baseInput = {
  streakDays: 0,
  isPerfectDay: false,
  isClassSynergy: false,
  isEarlyBird: false,
  isWeekend: false,
  hasXpElixir: false,
  hasXpFeast: false,
  isSeasonEvent: false,
  isComebackStreak: false,
};

describe('calculateXpMultiplier', () => {
  it('returns a 1x multiplier with no bonuses active', () => {
    expect(calculateXpMultiplier(baseInput).multiplier).toBe(1);
  });

  it('gives +5% per 7-day streak tranche, capped at +50%', () => {
    expect(calculateXpMultiplier({ ...baseInput, streakDays: 6 }).streakBonus).toBe(0);
    expect(calculateXpMultiplier({ ...baseInput, streakDays: 7 }).streakBonus).toBeCloseTo(0.05);
    expect(calculateXpMultiplier({ ...baseInput, streakDays: 70 }).streakBonus).toBeCloseTo(0.5);
    expect(calculateXpMultiplier({ ...baseInput, streakDays: 700 }).streakBonus).toBeCloseTo(0.5);
  });

  it('stacks independent bonuses additively', () => {
    const result = calculateXpMultiplier({
      ...baseInput,
      isPerfectDay: true,
      isEarlyBird: true,
    });
    expect(result.cappedBonus).toBeCloseTo(0.35);
    expect(result.multiplier).toBeCloseTo(1.35);
  });

  it('caps the total bonus at +200% absolute', () => {
    const result = calculateXpMultiplier({
      ...baseInput,
      streakDays: 700,
      isPerfectDay: true,
      isClassSynergy: true,
      isEarlyBird: true,
      isWeekend: true,
      hasXpElixir: true,
      hasXpFeast: true,
      isSeasonEvent: true,
      isComebackStreak: true,
    });
    expect(result.rawBonus).toBeGreaterThan(MAX_BONUS);
    expect(result.cappedBonus).toBe(MAX_BONUS);
    expect(result.multiplier).toBe(1 + MAX_BONUS);
  });
});
