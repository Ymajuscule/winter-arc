/**
 * Skill Points & talent tree — CDC v2.1 §22.
 *
 * Mirrors `classes.ts` ↔ `classes` table: this is the code-side catalog,
 * `supabase/migrations/20260828010100_user_skills.sql` is the allocation
 * table. The CDC lists 16 named nodes across 4 branches (Body/Mind/Spirit/
 * Fortune) as flat unlocks — 1 Skill Point per node, no per-node ranks
 * mentioned anywhere in §22 — so allocation is modeled as owned/not-owned,
 * not a point count per skill.
 */

export type SkillBranch = 'body' | 'mind' | 'spirit' | 'fortune';

export type SkillId =
  | 'iron_body'
  | 'recovery'
  | 'momentum'
  | 'overdrive'
  | 'focus_mastery'
  | 'deep_insight'
  | 'clarity'
  | 'sages_path'
  | 'zen'
  | 'anchor'
  | 'inner_fire'
  | 'harmony'
  | 'coin_purse'
  | 'lucky_chest'
  | 'merchant'
  | 'prestige_path';

export interface SkillDefinition {
  id: SkillId;
  branch: SkillBranch;
  name: string;
  description: string;
}

export const SKILLS: Record<SkillId, SkillDefinition> = {
  iron_body: {
    id: 'iron_body',
    branch: 'body',
    name: 'Iron Body',
    description: '+2% XP on all Fitness habits.',
  },
  recovery: {
    id: 'recovery',
    branch: 'body',
    name: 'Recovery',
    description: '+1 Recovery Day per month.',
  },
  momentum: {
    id: 'momentum',
    branch: 'body',
    name: 'Momentum',
    description: 'Streak bonus multiplier ×1.5.',
  },
  overdrive: {
    id: 'overdrive',
    branch: 'body',
    name: 'Overdrive',
    description: 'Unlocks the "Extreme Workout" quest type.',
  },
  focus_mastery: {
    id: 'focus_mastery',
    branch: 'mind',
    name: 'Focus Mastery',
    description: '+2% XP on Focus/reading habits.',
  },
  deep_insight: {
    id: 'deep_insight',
    branch: 'mind',
    name: 'Deep Insight',
    description: 'Unlocks weekly personalized Insights.',
  },
  clarity: {
    id: 'clarity',
    branch: 'mind',
    name: 'Clarity',
    description: 'Reduces the Recovery Day cooldown.',
  },
  sages_path: {
    id: 'sages_path',
    branch: 'mind',
    name: "Sage's Path",
    description: 'Unlocks special reading quests.',
  },
  zen: {
    id: 'zen',
    branch: 'spirit',
    name: 'Zen',
    description: 'Mood check-ins award +5 XP instead of +0.',
  },
  anchor: {
    id: 'anchor',
    branch: 'spirit',
    name: 'Anchor',
    description: 'Doubles the monthly Streak Freeze allowance to 2.',
  },
  inner_fire: {
    id: 'inner_fire',
    branch: 'spirit',
    name: 'Inner Fire',
    description: '+1 Daily Quest slot.',
  },
  harmony: {
    id: 'harmony',
    branch: 'spirit',
    name: 'Harmony',
    description: 'Bonus when multiple categories are active the same day.',
  },
  coin_purse: {
    id: 'coin_purse',
    branch: 'fortune',
    name: 'Coin Purse',
    description: '+20% Coins earned.',
  },
  lucky_chest: {
    id: 'lucky_chest',
    branch: 'fortune',
    name: 'Lucky Chest',
    description: "+5% chance to double a chest's contents.",
  },
  merchant: {
    id: 'merchant',
    branch: 'fortune',
    name: 'Merchant',
    description: '-10% prices in the Shop.',
  },
  prestige_path: {
    id: 'prestige_path',
    branch: 'fortune',
    name: 'Prestige Path',
    description: 'Accelerates progress toward Prestige.',
  },
};

export const SKILL_IDS = Object.keys(SKILLS) as SkillId[];

export function skillsInBranch(branch: SkillBranch): SkillDefinition[] {
  return SKILL_IDS.map((id) => SKILLS[id]).filter((s) => s.branch === branch);
}

/** A node can be allocated if the user has a free point and doesn't already own it — no per-node ranks (see file header). */
export function canAllocateSkill(
  ownedSkillIds: ReadonlySet<SkillId>,
  skillId: SkillId,
  availablePoints: number,
): boolean {
  return availablePoints > 0 && !ownedSkillIds.has(skillId);
}

/** Respec (CDC §22: "1 fois par saison, gratuit. Sinon coûteux en Coins"). */
export const SKILL_RESPEC_FREE_PER_SEASON = 1;
export const SKILL_RESPEC_COST_COINS = 500;
