import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS, CLASSES, classSynergyBonus, hasClassSynergy } from './classes';
import { LINKED_STATS_BY_CATEGORY } from './stats';

describe('hasClassSynergy', () => {
  it('matches a habit category against the class focus', () => {
    expect(hasClassSynergy('warrior', 'fitness')).toBe(true);
    expect(hasClassSynergy('warrior', 'knowledge')).toBe(false);
  });

  it('sage applies to every category', () => {
    expect(hasClassSynergy('sage', 'fitness')).toBe(true);
    expect(hasClassSynergy('sage', 'Anything')).toBe(true);
  });

  it('wanderer has no synergy', () => {
    expect(hasClassSynergy('wanderer', 'fitness')).toBe(false);
  });
});

describe('classSynergyBonus', () => {
  it('is 15% for a matching non-Sage class', () => {
    expect(classSynergyBonus('scholar', 'knowledge')).toBeCloseTo(0.15);
  });

  it('is 5% flat for Sage regardless of category', () => {
    expect(classSynergyBonus('sage', 'knowledge')).toBeCloseTo(0.05);
  });

  it('is 0 when there is no synergy', () => {
    expect(classSynergyBonus('warrior', 'knowledge')).toBe(0);
  });
});

describe('category vocabulary', () => {
  it('every class focus category is a real category id', () => {
    // Guards the bug this replaced: focusCategories held display labels
    // ('Focus', 'Discipline', 'Health') that no habit category could match,
    // so the Monk's and Ranger's +15% synergy never applied to anything.
    for (const def of Object.values(CLASSES)) {
      for (const category of def.focusCategories) {
        expect(CATEGORY_IDS, `${def.id} -> ${category}`).toContain(category);
      }
    }
  });

  it('every category id has a stat mapping', () => {
    for (const id of CATEGORY_IDS) {
      expect(LINKED_STATS_BY_CATEGORY[id], id).toBeDefined();
    }
  });

  it('gives the Monk synergy on a meditation habit', () => {
    expect(classSynergyBonus('monk', 'mind')).toBeGreaterThan(0);
    expect(classSynergyBonus('monk', 'digital')).toBeGreaterThan(0);
    expect(classSynergyBonus('monk', 'fitness')).toBe(0);
  });

  it('gives the Ranger synergy on sleep and nutrition', () => {
    expect(classSynergyBonus('ranger', 'sleep')).toBeGreaterThan(0);
    expect(classSynergyBonus('ranger', 'nutrition')).toBeGreaterThan(0);
  });
});
