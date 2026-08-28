/**
 * Static onboarding content (CDC §9). Some of this is CDC-literal (domains,
 * their exact copy), some is a reasonable documented fill-in where the CDC
 * gives an example shape but not a full list (goal suggestions beyond
 * Fitness's; the 12 avatar names/descriptions — the CDC says "12 options"
 * but never names them beyond the wireframe's single "The Warrior" example).
 * Not game math — safe to expand/edit without touching game-engine.
 *
 * Avatar `id`s are exactly `supabase/seed/002_cosmetics.sql`'s 12 seeded
 * `avatar-*` cosmetic ids (2026-08-28: aligned after `bootstrap-profile`
 * needed a real `cosmetics.id` FK for `profiles.avatar_id` — the original
 * placeholder ids here didn't match the seed at all, a real gap found while
 * wiring the backend, not a hypothetical one).
 */

export interface AvatarOption {
  id: string;
  name: string;
  description: string;
}

/** CDC §9 Écran 3 — 12 free starter avatars, each with a short flavor description. */
export const AVATARS: AvatarOption[] = [
  { id: 'avatar-warrior', name: 'The Warrior', description: 'Disciplined, direct.' },
  { id: 'avatar-scholar', name: 'The Scholar', description: 'Curious, precise.' },
  { id: 'avatar-monk', name: 'The Monk', description: 'Calm, focused.' },
  { id: 'avatar-ranger', name: 'The Ranger', description: 'Steady, resourceful.' },
  { id: 'avatar-artisan', name: 'The Artisan', description: 'Expressive, exacting.' },
  { id: 'avatar-sage', name: 'The Sage', description: 'Balanced, observant.' },
  { id: 'avatar-wanderer', name: 'The Wanderer', description: 'Free, unbound.' },
  { id: 'avatar-forger', name: 'The Forger', description: 'Methodical, hands-on.' },
  { id: 'avatar-voyager', name: 'The Voyager', description: 'Curious, far-ranging.' },
  { id: 'avatar-sentinel', name: 'The Sentinel', description: 'Watchful, steady.' },
  { id: 'avatar-oracle', name: 'The Oracle', description: 'Perceptive, quiet.' },
  { id: 'avatar-outrider', name: 'The Outrider', description: 'Bold, ahead of the pack.' },
];

export interface DomainOption {
  id: string;
  label: string;
  emoji: string;
}

/**
 * CDC §9 Écran 6 — literal list + emoji. The CDC's own copy uses emoji here
 * specifically (wireframes.md notes this explicitly as the one sanctioned
 * exception to Design Law rule 3, not a general license to use them
 * elsewhere).
 */
export const DOMAINS: DomainOption[] = [
  { id: 'fitness', label: 'Fitness', emoji: '💪' },
  { id: 'mind', label: 'Mind', emoji: '🧠' },
  { id: 'knowledge', label: 'Knowledge', emoji: '📚' },
  { id: 'career', label: 'Career', emoji: '💼' },
  { id: 'finance', label: 'Finance', emoji: '💰' },
  { id: 'sleep', label: 'Sleep', emoji: '😴' },
  { id: 'nutrition', label: 'Nutrition', emoji: '🥗' },
  { id: 'energy', label: 'Energy', emoji: '⚡' },
  { id: 'digital', label: 'Digital Discipline', emoji: '📵' },
  { id: 'mental', label: 'Mental Wellness', emoji: '🧘' },
  { id: 'creativity', label: 'Creativity', emoji: '🎨' },
  { id: 'relationships', label: 'Relationships', emoji: '🤝' },
];

export const DOMAINS_MIN = 2;
export const DOMAINS_MAX = 6;

export interface GoalOption {
  id: string;
  label: string;
}

/** CDC only spells out Fitness's goal list as an example — the rest follow the same shape/count. */
export const GOALS_BY_DOMAIN: Record<string, GoalOption[]> = {
  fitness: [
    { id: 'run-3x', label: 'Run 3x/week' },
    { id: 'strength-2x', label: 'Strength training 2x/week' },
    { id: '10k-steps', label: '10k steps/day' },
  ],
  mind: [
    { id: 'meditate-daily', label: 'Meditate daily' },
    { id: 'journal-daily', label: 'Journal daily' },
    { id: 'phone-free-morning', label: 'No phone the first hour' },
  ],
  knowledge: [
    { id: 'read-30', label: 'Read 30 min/day' },
    { id: 'course-weekly', label: 'One course lesson/week' },
    { id: 'language-practice', label: 'Practice a language' },
  ],
  career: [
    { id: 'deep-work-2h', label: '2h deep work/day' },
    { id: 'skill-weekly', label: 'Learn a new skill weekly' },
    { id: 'network-monthly', label: 'Network monthly' },
  ],
  finance: [
    { id: 'track-spending', label: 'Track spending daily' },
    { id: 'save-weekly', label: 'Save weekly' },
    { id: 'no-impulse', label: 'No impulse buys' },
  ],
  sleep: [
    { id: 'sleep-7h', label: 'Sleep 7h+' },
    { id: 'consistent-bedtime', label: 'Consistent bedtime' },
    { id: 'no-screens-bed', label: 'No screens in bed' },
  ],
  nutrition: [
    { id: 'water-2l', label: 'Drink 2L water' },
    { id: 'cut-sugar', label: 'Cut added sugar' },
    { id: 'meal-prep', label: 'Meal prep weekly' },
  ],
  energy: [
    { id: 'morning-sun', label: 'Morning sunlight' },
    { id: 'move-hourly', label: 'Move every hour' },
    { id: 'nap-discipline', label: 'No naps after 3pm' },
  ],
  digital: [
    { id: 'screen-limit', label: 'Daily screen limit' },
    { id: 'no-socials-morning', label: 'No socials before noon' },
    { id: 'phone-free-meals', label: 'Phone-free meals' },
  ],
  mental: [
    { id: 'gratitude', label: 'Gratitude practice' },
    { id: 'weekly-checkin', label: 'Weekly self check-in' },
    { id: 'breathing', label: 'Daily breathing exercise' },
  ],
  creativity: [
    { id: 'create-daily', label: 'Create something daily' },
    { id: 'sketch-weekly', label: 'Sketch weekly' },
    { id: 'make-not-consume', label: "Make, don't just consume" },
  ],
  relationships: [
    { id: 'call-family', label: 'Call family weekly' },
    { id: 'quality-time', label: 'Quality time daily' },
    { id: 'reach-out', label: 'Reach out to a friend weekly' },
  ],
};

export const GOALS_MIN = 1;
export const GOALS_MAX = 3;
