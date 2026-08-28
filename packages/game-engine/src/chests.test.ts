import { describe, expect, it } from 'vitest';
import { CHEST_SPECS, FRAGMENT_VALUE_BY_RARITY, rollChestRarities } from './chests.js';

function constantRng(value: number) {
  return () => value;
}

describe('rollChestRarities', () => {
  it('yields exactly the CDC-specified item count per chest type (CDC §74)', () => {
    expect(rollChestRarities('wooden', constantRng(0))).toHaveLength(1);
    expect(rollChestRarities('iron', constantRng(0))).toHaveLength(2);
    expect(rollChestRarities('silver', constantRng(0))).toHaveLength(3);
    // Gold: 4 regular + 1 guaranteed legendary
    expect(rollChestRarities('gold', constantRng(0))).toHaveLength(5);
    expect(rollChestRarities('obsidian', constantRng(0))).toHaveLength(5);
  });

  it('always includes the guaranteed slot for Gold chests', () => {
    const rarities = rollChestRarities('gold', constantRng(0.99));
    expect(rarities).toContain('legendary');
  });

  it('a rng of 0 always picks the first pool entry', () => {
    const rarities = rollChestRarities('wooden', constantRng(0));
    expect(rarities).toEqual(['common']);
  });

  it("only draws from the rarities declared in that chest type's pool", () => {
    for (const [type, spec] of Object.entries(CHEST_SPECS)) {
      const allowedRarities = new Set([...Object.keys(spec.pool), spec.guaranteed].filter(Boolean));
      for (const trial of [0, 0.25, 0.5, 0.75, 0.999]) {
        const rarities = rollChestRarities(type as keyof typeof CHEST_SPECS, constantRng(trial));
        for (const rarity of rarities) {
          expect(allowedRarities.has(rarity)).toBe(true);
        }
      }
    }
  });
});

describe('FRAGMENT_VALUE_BY_RARITY', () => {
  it('matches the CDC §76 table for the rarities it specifies', () => {
    expect(FRAGMENT_VALUE_BY_RARITY.common).toBe(5);
    expect(FRAGMENT_VALUE_BY_RARITY.uncommon).toBe(15);
    expect(FRAGMENT_VALUE_BY_RARITY.rare).toBe(50);
    expect(FRAGMENT_VALUE_BY_RARITY.epic).toBe(200);
    expect(FRAGMENT_VALUE_BY_RARITY.legendary).toBe(1000);
  });
});
