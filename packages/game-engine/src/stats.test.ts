import { describe, expect, it } from 'vitest';
import {
  applyStatDecay,
  calculateStatRawPoints,
  calculateStatScores,
  statScoreFromRawPoints,
} from './stats.js';

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
