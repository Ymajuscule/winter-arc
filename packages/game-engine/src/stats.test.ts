import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LINKED_STATS,
  LINKED_STATS_BY_CATEGORY,
  STAT_IDS,
  applyStatDecay,
  calculateStatRawPoints,
  calculateStatScores,
  consistencyScore,
  linkedStatsForCategory,
  statScoreFromRawPoints,
} from './stats';

describe('calculateStatRawPoints', () => {
  it('accumulates weighted points per stat across contributions', () => {
    const totals = calculateStatRawPoints([
      { linkedStats: [{ stat: 'strength', weight: 2 }], completionPct: 100 },
      { linkedStats: [{ stat: 'strength', weight: 2 }], completionPct: 50 },
    ]);
    expect(totals.strength).toBe(3); // 2*1.0 + 2*0.5
    expect(totals.discipline).toBe(0);
  });

  it('splits a single completion across multiple linked stats (CDC §31 linked_stats)', () => {
    const totals = calculateStatRawPoints([
      {
        linkedStats: [
          { stat: 'strength', weight: 3 },
          { stat: 'discipline', weight: 1 },
        ],
        completionPct: 100,
      },
    ]);
    expect(totals.strength).toBe(3);
    expect(totals.discipline).toBe(1);
  });
});

describe('statScoreFromRawPoints', () => {
  it('is 0 at 0 points and asymptotic toward but never reaching 100', () => {
    expect(statScoreFromRawPoints(0)).toBe(0);
    // Far below the saturation constant so rounding doesn't clip it to 100 —
    // the curve is asymptotic (never truly reaches 100) but rounds there
    // once raw points are large enough, which is by design.
    expect(statScoreFromRawPoints(200)).toBeLessThan(100);
    expect(statScoreFromRawPoints(200)).toBeGreaterThan(90);
  });

  it('is monotonically increasing', () => {
    expect(statScoreFromRawPoints(10)).toBeLessThan(statScoreFromRawPoints(50));
    expect(statScoreFromRawPoints(50)).toBeLessThan(statScoreFromRawPoints(200));
  });
});

describe('calculateStatScores', () => {
  it('returns all 7 stats even when only some are touched', () => {
    const scores = calculateStatScores([
      { linkedStats: [{ stat: 'focus', weight: 5 }], completionPct: 100 },
    ]);
    expect(Object.keys(scores).sort()).toEqual(
      ['consistency', 'discipline', 'energy', 'focus', 'health', 'knowledge', 'strength'].sort(),
    );
    expect(scores.focus).toBeGreaterThan(0);
    expect(scores.strength).toBe(0);
  });
});

describe('applyStatDecay', () => {
  it('never decays within the 14-day grace period (CDC §26)', () => {
    expect(applyStatDecay(50, 14)).toBe(50);
    expect(applyStatDecay(50, 0)).toBe(50);
  });

  it('decays at most 1 point per day past the grace period', () => {
    expect(applyStatDecay(50, 20)).toBe(44); // 6 days past grace
  });

  it('never decays below 0', () => {
    expect(applyStatDecay(3, 100)).toBe(0);
  });
});

describe('linkedStatsForCategory', () => {
  it('maps every onboarding domain to at least one stat', () => {
    // The 12 DOMAINS ids from apps/mobile's onboarding-content.ts — if one is
    // added there without a mapping here, its habits feed nothing.
    const domains = [
      'fitness',
      'mind',
      'knowledge',
      'career',
      'finance',
      'sleep',
      'nutrition',
      'energy',
      'digital',
      'mental',
      'creativity',
      'relationships',
    ];
    for (const domain of domains) {
      expect(LINKED_STATS_BY_CATEGORY[domain], domain).toBeDefined();
      expect(linkedStatsForCategory(domain).length).toBeGreaterThan(0);
    }
  });

  it('falls back to discipline for an unknown category rather than nothing', () => {
    expect(linkedStatsForCategory('a-category-the-user-typed')).toEqual(DEFAULT_LINKED_STATS);
    expect(linkedStatsForCategory('a-category-the-user-typed').length).toBeGreaterThan(0);
  });

  it('never maps a category to consistency — that stat comes from streaks', () => {
    for (const linked of Object.values(LINKED_STATS_BY_CATEGORY)) {
      expect(linked.some((l) => l.stat === 'consistency')).toBe(false);
    }
  });

  it('only references real stat ids', () => {
    for (const linked of Object.values(LINKED_STATS_BY_CATEGORY)) {
      for (const l of linked) expect(STAT_IDS).toContain(l.stat);
    }
  });

  it('feeds a fitness habit into strength above anything else', () => {
    const scores = calculateStatScores([
      { linkedStats: linkedStatsForCategory('fitness'), completionPct: 100 },
    ]);
    expect(scores.strength).toBeGreaterThan(scores.energy);
    expect(scores.strength).toBeGreaterThan(scores.knowledge);
  });
});

describe('consistencyScore', () => {
  it('is zero for a user who has never held a streak', () => {
    expect(consistencyScore({ currentStreak: 0, longestStreak: 0 })).toBe(0);
  });

  it('grows with the current streak', () => {
    const short = consistencyScore({ currentStreak: 5, longestStreak: 5 });
    const long = consistencyScore({ currentStreak: 40, longestStreak: 40 });
    expect(long).toBeGreaterThan(short);
  });

  it('keeps most of the score after a streak breaks — stats stagnate, they do not drop', () => {
    const held = consistencyScore({ currentStreak: 60, longestStreak: 60 });
    const broken = consistencyScore({ currentStreak: 0, longestStreak: 60 });
    expect(broken).toBeGreaterThan(0);
    expect(broken).toBeLessThan(held);
  });

  it('stays within 0-100', () => {
    expect(consistencyScore({ currentStreak: 3650, longestStreak: 3650 })).toBeLessThanOrEqual(100);
    expect(consistencyScore({ currentStreak: -5, longestStreak: -5 })).toBe(0);
  });
});
