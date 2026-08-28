import { describe, expect, it } from 'vitest';
import { DAILY_XP_CAP, applyDailyXpCap, levelFromTotalXp, xpRequiredForLevel } from './xp';

describe('xpRequiredForLevel', () => {
  it('matches the literal CDC §20 formula for level 1', () => {
    expect(xpRequiredForLevel(1)).toBe(500);
  });

  it('grows monotonically with level', () => {
    expect(xpRequiredForLevel(10)).toBeGreaterThan(xpRequiredForLevel(5));
    expect(xpRequiredForLevel(50)).toBeGreaterThan(xpRequiredForLevel(10));
  });

  it('rejects level < 1', () => {
    expect(() => xpRequiredForLevel(0)).toThrow(RangeError);
  });
});

describe('levelFromTotalXp', () => {
  it('starts at level 1 with 0 XP', () => {
    const p = levelFromTotalXp(0);
    expect(p.level).toBe(1);
    expect(p.xpIntoLevel).toBe(0);
  });

  it('reaches level 2 exactly at the level-1 requirement', () => {
    const required = xpRequiredForLevel(1);
    const p = levelFromTotalXp(required);
    expect(p.level).toBe(2);
    expect(p.xpIntoLevel).toBe(0);
  });

  it('is one XP short of the next level just below the threshold', () => {
    const required = xpRequiredForLevel(1);
    const p = levelFromTotalXp(required - 1);
    expect(p.level).toBe(1);
    expect(p.xpToNextLevel).toBe(1);
  });

  it('caps at level 100', () => {
    const p = levelFromTotalXp(50_000_000);
    expect(p.level).toBe(100);
    expect(p.xpToNextLevel).toBe(0);
  });

  it('rejects negative XP', () => {
    expect(() => levelFromTotalXp(-1)).toThrow(RangeError);
  });
});

describe('applyDailyXpCap', () => {
  it('applies the full gain when under the cap', () => {
    const result = applyDailyXpCap(0, 500);
    expect(result).toEqual({ applied: 500, overflow: 0 });
  });

  it('clips at the daily cap and reports overflow', () => {
    const result = applyDailyXpCap(DAILY_XP_CAP - 200, 500);
    expect(result.applied).toBe(200);
    expect(result.overflow).toBe(300);
  });

  it('sends everything to overflow once the cap is already hit', () => {
    const result = applyDailyXpCap(DAILY_XP_CAP, 100);
    expect(result).toEqual({ applied: 0, overflow: 100 });
  });
});
