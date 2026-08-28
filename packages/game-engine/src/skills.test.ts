import { describe, expect, it } from 'vitest';
import { SKILL_IDS, canAllocateSkill, skillsInBranch } from './skills.js';

describe('skillsInBranch', () => {
  it('returns exactly 4 nodes per branch (CDC §22: 4 branches of 4)', () => {
    for (const branch of ['body', 'mind', 'spirit', 'fortune'] as const) {
      expect(skillsInBranch(branch)).toHaveLength(4);
    }
  });

  it('covers all 16 skill ids across the 4 branches with no overlap', () => {
    const total = (['body', 'mind', 'spirit', 'fortune'] as const).flatMap((b) =>
      skillsInBranch(b).map((s) => s.id),
    );
    expect(new Set(total).size).toBe(16);
    expect(SKILL_IDS).toHaveLength(16);
  });
});

describe('canAllocateSkill', () => {
  it('requires at least one available point', () => {
    expect(canAllocateSkill(new Set(), 'iron_body', 0)).toBe(false);
    expect(canAllocateSkill(new Set(), 'iron_body', 1)).toBe(true);
  });

  it('refuses to re-allocate an already-owned node (flat unlock, no ranks)', () => {
    expect(canAllocateSkill(new Set(['iron_body']), 'iron_body', 5)).toBe(false);
  });
});
