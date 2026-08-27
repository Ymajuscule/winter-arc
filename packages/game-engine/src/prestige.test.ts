import { describe, expect, it } from 'vitest';
import { applyPrestige, canPrestige, isLegend, prestigeXpBonus } from './prestige.js';

describe('canPrestige', () => {
  it('requires level 100', () => {
    expect(canPrestige({ level: 99, prestigeRank: 0 })).toBe(false);
    expect(canPrestige({ level: 100, prestigeRank: 0 })).toBe(true);
  });

  it('is false once Prestige X is reached', () => {
    expect(canPrestige({ level: 100, prestigeRank: 10 })).toBe(false);
  });
});

describe('applyPrestige', () => {
  it('resets level, keeps lifetime XP, increments rank', () => {
    const result = applyPrestige({ level: 100, prestigeRank: 2, lifetimeXp: 4_900_000 });
    expect(result).toEqual({ level: 1, prestigeRank: 3, lifetimeXp: 4_900_000 });
  });

  it('throws when not eligible', () => {
    expect(() => applyPrestige({ level: 50, prestigeRank: 0, lifetimeXp: 0 })).toThrow();
  });
});

describe('prestigeXpBonus', () => {
  it('is +2% per rank, capped at +20%', () => {
    expect(prestigeXpBonus(0)).toBe(0);
    expect(prestigeXpBonus(1)).toBeCloseTo(0.02);
    expect(prestigeXpBonus(10)).toBeCloseTo(0.2);
    expect(prestigeXpBonus(20)).toBeCloseTo(0.2);
  });
});

describe('isLegend', () => {
  it('is true only at Prestige X or above', () => {
    expect(isLegend(9)).toBe(false);
    expect(isLegend(10)).toBe(true);
  });
});
