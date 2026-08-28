/**
 * Chest rolls & Fragments — CDC v2.1 §74, §76.
 *
 * api-specifications.md flags the exact rarity-roll percentages as
 * undecided ("à trancher avant l'implémentation... sinon valeurs
 * raisonnables à documenter dans le code"). These are that decision — item
 * counts match the CDC's per-chest description exactly (Wooden 1, Iron 1-3,
 * Silver 3, Gold 4+guaranteed Legendary, Obsidian 5+chance of Mythic); the
 * rarity odds within each chest's stated pool are a reasonable default, not
 * CDC-specified, and easy to retune later (same "tunable constant"
 * precedent as the XP curve).
 */

export type ChestType = 'wooden' | 'iron' | 'silver' | 'gold' | 'obsidian';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface ChestRollSpec {
  itemCount: number;
  /** Weighted rarity pool regular slots are drawn from. */
  pool: Partial<Record<Rarity, number>>;
  /** An extra guaranteed slot at this exact rarity, on top of itemCount — Gold's guaranteed Legendary (CDC §74). */
  guaranteed?: Rarity;
}

export const CHEST_SPECS: Record<ChestType, ChestRollSpec> = {
  wooden: { itemCount: 1, pool: { common: 100 } },
  iron: { itemCount: 2, pool: { common: 70, uncommon: 30 } },
  silver: { itemCount: 3, pool: { uncommon: 60, rare: 40 } },
  gold: { itemCount: 4, pool: { rare: 60, epic: 40 }, guaranteed: 'legendary' },
  obsidian: { itemCount: 5, pool: { epic: 70, legendary: 25, mythic: 5 } },
};

function weightedPick(pool: Partial<Record<Rarity, number>>, rng: () => number): Rarity {
  const entries = Object.entries(pool) as [Rarity, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [rarity, weight] of entries) {
    if (roll < weight) return rarity;
    roll -= weight;
  }
  const last = entries[entries.length - 1];
  if (!last) throw new Error('Empty rarity pool for chest spec');
  return last[0];
}

/** Rolls the rarity of each item a chest yields. `rng` is injectable (defaults to Math.random) for deterministic tests — not a mock, a legitimate parameter. */
export function rollChestRarities(type: ChestType, rng: () => number = Math.random): Rarity[] {
  const spec = CHEST_SPECS[type];
  const rarities: Rarity[] = [];
  for (let i = 0; i < spec.itemCount; i += 1) {
    rarities.push(weightedPick(spec.pool, rng));
  }
  if (spec.guaranteed) rarities.push(spec.guaranteed);
  return rarities;
}

/** Fragment value when a rolled item is a duplicate — CDC §76. Mythic has no stated value; defaults to Legendary's (documented, not CDC-specified). */
export const FRAGMENT_VALUE_BY_RARITY: Record<Rarity, number> = {
  common: 5,
  uncommon: 15,
  rare: 50,
  epic: 200,
  legendary: 1000,
  mythic: 1000,
};

/** Fragment Forge craft costs — CDC §76. */
export const FRAGMENT_CRAFT_COST: Partial<Record<Rarity, number>> = {
  uncommon: 100,
  rare: 500,
  epic: 2000,
  legendary: 8000,
};
