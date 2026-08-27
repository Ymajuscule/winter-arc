import { describe, expect, it } from 'vitest';
import { classSynergyBonus, hasClassSynergy } from './classes.js';

describe('hasClassSynergy', () => {
  it('matches a habit category against the class focus', () => {
    expect(hasClassSynergy('warrior', 'Fitness')).toBe(true);
    expect(hasClassSynergy('warrior', 'Knowledge')).toBe(false);
  });

  it('sage applies to every category', () => {
    expect(hasClassSynergy('sage', 'Fitness')).toBe(true);
    expect(hasClassSynergy('sage', 'Anything')).toBe(true);
  });

  it('wanderer has no synergy', () => {
    expect(hasClassSynergy('wanderer', 'Fitness')).toBe(false);
  });
});

describe('classSynergyBonus', () => {
  it('is 15% for a matching non-Sage class', () => {
    expect(classSynergyBonus('scholar', 'Knowledge')).toBeCloseTo(0.15);
  });

  it('is 5% flat for Sage regardless of category', () => {
    expect(classSynergyBonus('sage', 'Knowledge')).toBeCloseTo(0.05);
  });

  it('is 0 when there is no synergy', () => {
    expect(classSynergyBonus('warrior', 'Knowledge')).toBe(0);
  });
});
