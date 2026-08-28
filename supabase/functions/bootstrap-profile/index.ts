// @ts-nocheck -- Deno Edge Function (npm:/Deno.serve), not resolved by the repo's Node/tsc typecheck.
/**
 * bootstrap-profile — CDC §8-13 (onboarding completion) + §108 (schema).
 *
 * Real gap found while wiring the mobile app to the live backend
 * (2026-08-28, continuation 4): nothing in the schema auto-creates a
 * `profiles` row for a new `auth.users` row (no trigger, no other Edge
 * Function touches it before this). Without this function, every other
 * Edge Function 404s on "Profile not found" for a brand new account —
 * `award-habit-xp`, `claim-quest`, etc. all assume the row already exists.
 *
 * Called once, right after Écran 13 (Reward) with everything onboarding
 * collected. Idempotent by design (checked per-table, not one global flag):
 * safe to call again — e.g. a returning user signing in on a new device —
 * and it returns the existing state instead of erroring or duplicating.
 * Habits are only inserted the first time (checked via "does this user have
 * any habits yet"); calling again with a different habits list does NOT
 * add more — habit management after onboarding is a separate, not-yet-
 * written concern (CDC §11: "Habitudes → à tout moment").
 *
 * Grants the CDC §13 "first reward" directly (title-awakened, frame-iron,
 * a Day Zero achievement) rather than routing through
 * evaluate-achievements — these are onboarding-completion rewards, not
 * gameplay-condition unlocks. `day-zero` was added to the achievements
 * catalog for this (empty `all_of` = vacuously true, CDC §13 never gave it
 * an XP value so it's 0 XP / 10 coins, a welcome flag not a grind reward).
 *
 * No `arcs` row is created — Arc creation/lifecycle (CDC §134 Phase 0 gap,
 * still open per TODO.md) isn't built yet. Habits get `arc_id: null`
 * ("habitude persistante hors arc", explicitly schema-supported).
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getUserFromRequest, supabaseAdmin } from '../_shared/supabase-admin.ts';

interface BootstrapProfileBody {
  username: string;
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
  classId: string | null;
  avatarId: string | null;
  habits: Array<{ name: string; category: string }>;
}

const DEFAULT_HABIT_XP = 40; // CDC §18 — simple habit default
const DAY_ZERO_ACHIEVEMENT_ID = 'day-zero';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const user = await getUserFromRequest(req);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const body = (await req.json()) as BootstrapProfileBody;
  if (!body.username) return jsonResponse({ error: 'username is required' }, 400);

  const db = supabaseAdmin();

  const { data: existingProfile } = await db
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  let profile = existingProfile;

  if (!profile) {
    const { data: created, error: profileError } = await db
      .from('profiles')
      .insert({
        user_id: user.id,
        username: body.username,
        level: 1,
        total_xp: 0,
        lifetime_xp: 0,
        prestige_rank: 0,
        skill_points: 0,
        current_class_id: body.classId,
        difficulty: body.difficulty,
        avatar_id: body.avatarId,
        frame_id: 'frame-iron', // CDC §13 first reward
        title_id: 'title-awakened', // CDC §13 first reward
      })
      .select()
      .single();
    if (profileError) return jsonResponse({ error: profileError.message }, 500);
    profile = created;

    await db.from('user_achievements').insert({
      user_id: user.id,
      achievement_id: DAY_ZERO_ACHIEVEMENT_ID,
    });
  }

  const { data: existingCurrency } = await db
    .from('user_currency')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  const currency =
    existingCurrency ??
    (
      await db
        .from('user_currency')
        .insert({ user_id: user.id, coins: 10, embers: 0 }) // Day Zero coin grant
        .select()
        .single()
    ).data;

  const { data: existingStreak } = await db
    .from('streaks')
    .select('*')
    .eq('user_id', user.id)
    .eq('scope', 'global')
    .is('scope_ref', null)
    .maybeSingle();
  const streak =
    existingStreak ??
    (
      await db
        .from('streaks')
        .insert({ user_id: user.id, scope: 'global', scope_ref: null })
        .select()
        .single()
    ).data;

  const { data: existingHabits } = await db.from('habits').select('*').eq('user_id', user.id);

  let habits = existingHabits ?? [];
  if (habits.length === 0 && body.habits && body.habits.length > 0) {
    const { data: insertedHabits, error: habitsError } = await db
      .from('habits')
      .insert(
        body.habits.map((h) => ({
          user_id: user.id,
          arc_id: null,
          name: h.name,
          category: h.category,
          type: 'boolean',
          difficulty: 'medium',
          xp_value: DEFAULT_HABIT_XP,
        })),
      )
      .select();
    if (habitsError) return jsonResponse({ error: habitsError.message }, 500);
    habits = insertedHabits ?? [];
  }

  return jsonResponse({
    profile,
    currency,
    streak,
    habits,
    alreadyBootstrapped: existingProfile != null,
  });
});
