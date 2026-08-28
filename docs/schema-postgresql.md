# Schéma PostgreSQL complet

> Document complémentaire n°2 requis par le CDC (Annexe C). Décrit `supabase/migrations/20260827000000_init_core_schema.sql` (25 tables, Phase 1 + parties structurelles de Phase 2) table par table : colonnes, contraintes, index, RLS. Le fichier `.sql` fait foi en cas de divergence — ce document est la vue lisible, pas une deuxième source de vérité.
>
> Portée : le schéma actuel couvre CDC §135-136 (MVP + structure V1). Les tables V1.5+ (sub-stats §27, guilds publiques, marketplace créateurs) ne sont pas encore modélisées — à ajouter quand leur phase démarre, pas avant.

---

## Vue d'ensemble

```
auth.users (Supabase Auth)
  └── profiles (1:1)          ← identité publique + état de progression + équipement cosmétique
       ├── arcs (1:N)
       │    └── habits (1:N, nullable arc_id pour habitudes persistantes)
       │         └── habit_logs (1:N)
       ├── xp_transactions (1:N)         [écriture: service role only]
       ├── user_currency (1:1)           [écriture: service role only]
       ├── streaks (1:N, scope+scope_ref)
       ├── user_cosmetics (N:M avec cosmetics)   [écriture: service role only]
       ├── loadouts (1:N)
       ├── user_achievements (N:M avec achievements)  [écriture: service role only]
       ├── user_quests (1:N, référence quest_definitions)
       ├── chests (1:N)                  [écriture: service role only]
       ├── battle_passes (1:N, référence seasons)
       ├── journal_entries (1:N)
       ├── mood_checkins (1:N)
       └── squad_members (N:M avec squads)

Catalogues (lecture publique, écriture service role) :
  classes, seasons, cosmetics, achievements, quest_definitions

Social :
  squads, squad_members, challenges, challenge_participants

Audit :
  audit_logs (aucun accès client, service role uniquement)
```

## Convention RLS (voir `supabase-ops` skill pour le raisonnement complet)

- **Catalogues** : `select` public, aucune policy d'écriture pour `authenticated`.
- **Tables personnelles de jeu** (tout ce qui touche XP/monnaie/cosmétiques/achievements/coffres/battle pass) : `select` scopé à `auth.uid() = user_id`, **aucune** policy d'écriture pour `authenticated` — seule une Edge Function via la clé service role écrit. C'est la frontière anti-triche du CDC §127.
- **Squads** : `select` scopé aux membres, via une sous-requête sur `squad_members`.
- **`audit_logs`** : RLS activé, zéro policy → aucun accès client, ni lecture ni écriture.

---

## Tables — catalogues

### `classes`
| Colonne | Type | Notes |
|---|---|---|
| `id` | text PK | `warrior`, `scholar`, `monk`, `ranger`, `artisan`, `sage`, `wanderer` |
| `name`, `icon`, `focus`, `bonus_description` | text | Affichage |
| `xp_bonus_pct` | numeric | Doit rester synchronisé avec `packages/game-engine/src/classes.ts` (`CLASSES`) |

### `seasons`
| Colonne | Type | Notes |
|---|---|---|
| `id` | text PK | Slug de saison, ex. `winter-2027` |
| `name`, `theme` | text | CDC §100 (narration) |
| `starts_on`, `ends_on` | date | |

### `cosmetics`
Catalogue des 12 catégories du CDC §49 (`avatar`, `frame`, `aura`, `banner`, `nameplate`, `title`, `emblem`, `sigil`, `theme`, `streak_flame`, `xp_bar_style`, `level_badge`).

| Colonne | Type | Notes |
|---|---|---|
| `id` | text PK | Slug, ex. `frame-obsidian` |
| `category` | text, check | Une des 12 valeurs ci-dessus |
| `rarity` | text, check | `common` → `mythic` (CDC §45) |
| `unlock_method` | jsonb | Métadonnées d'affichage, pas une FK stricte — voir `docs/api-specifications.md` §Unlock methods |
| `is_purchasable`, `coin_price`, `ember_price` | | Shop (CDC §72-73) |
| `is_limited`, `available_from`, `available_until` | | Exclusivité saisonnière/événementielle (CDC §65) |

### `achievements`
| Colonne | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `rarity` | text, check | CDC §45 |
| `category` | text, check | **Exactement** `progression \| consistency \| social \| exploration \| prestige` (CDC §44) — "domain-specific" et "secret" du §46 ne sont *pas* des catégories DB : domain-specific → filé sous `progression`, secret → `hidden = true` avec la catégorie qui convient le mieux |
| `condition` | jsonb | Doit matcher `AchievementCondition` dans `packages/game-engine/src/achievements.ts` |
| `cosmetic_reward` | text, FK → `cosmetics.id`, nullable | |
| `hidden` | boolean | Achievements secrets (CDC §46) |
| `progress_tracking` | boolean | Affiche une barre de progression avant déblocage |

### `quest_definitions`
| Colonne | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `type` | text, check | `daily \| weekly \| monthly \| boss \| arc_boss \| class` |
| `condition` | jsonb | Pas encore de DSL formalisé — voir TODO.md, gap ouvert |
| `class_id` | FK → `classes.id`, nullable | Quêtes de classe (CDC §30) |

---

## Tables — profil & progression

### `profiles`
Étend `auth.users` en 1:1. Combine identité publique (CDC §108 `Profile`) et état de progression (CDC §108 `User` — `level`, `totalXP`, `prestigeRank`, `skillPoints`, `currentClassId`), fusionnés en une seule table plutôt que deux, pattern Supabase idiomatique.

| Colonne | Notes |
|---|---|
| `user_id` PK, FK → `auth.users(id)` | |
| `username` unique | |
| `level`, `total_xp`, `prestige_rank`, `skill_points` | État de jeu — écrit uniquement par `award-habit-xp` et les futures Edge Functions équivalentes |
| `current_class_id` | FK → `classes.id`, nullable |
| `difficulty` | check `easy \| normal \| hard \| extreme` (CDC §9 Écran 9) |
| `avatar_id`, `frame_id`, `aura_id`, `banner_id`, `nameplate_id`, `title_id`, `emblem_id`, `sigil_id`, `theme_id`, `flame_style_id`, `xp_bar_style_id`, `level_badge_id` | Chacun FK → `cosmetics.id`, nullable — l'équipement actif (les 12 slots du CDC §49) |
| `is_public` | Contrôle la visibilité du profil (CDC §67) |

RLS : `select` pour le propriétaire OU si `is_public = true` (profils publics consultables, ex. leaderboards/squad).

### `user_currency`
1:1 avec l'utilisateur. `coins`, `embers`, `fragments` (jsonb, par rareté — CDC §76).

### `xp_transactions`
Append-only, jamais d'update/delete côté client. `source` check-contraint sur les 13 sources du CDC §18. Index sur `(user_id, created_at desc)` pour les requêtes "XP du jour" (cap quotidien, CDC §19).

### `user_cosmetics`
Table de jonction N:M, PK composite `(user_id, cosmetic_id)`. `unlock_source` en texte libre (`'level'`, `'achievement'`, `'shop'`, `'chest'`...) — pas de check-contraint strict, c'est un libellé d'affichage.

### `loadouts`
`configuration` jsonb = un snapshot complet des 12 slots (CDC §61). `is_active` marque le loadout courant.

### `user_achievements`
PK composite `(user_id, achievement_id)`. `progress` (0-100) pour les achievements à `progress_tracking = true`.

---

## Tables — Arc, habitudes, streaks

### `arcs`
`status` check `active \| completed \| abandoned \| vacation` (Vacation Mode, CDC §39). `completion_pct` recalculé par l'Edge Function qui clôture un Arc (pas encore écrite).

### `habits`
Modèle complet du CDC §31. `type` check sur les 7 types (§32) — note : `time_based` et `photo` sont dans le check-contraint mais pas encore gérés par `award-habit-xp` (qui ne traite que boolean/numeric/duration/counter/distance). `linked_stats` jsonb = `[{stat, weight}]` pour alimenter les 7 stats (CDC §26) — pas encore consommé côté code, gap ouvert.

### `habit_logs`
`unique(habit_id, logged_for)` — une complétion par habitude par jour, empêche le double-log que `award-habit-xp` vérifie explicitement avant d'insérer.

### `streaks`
`unique(user_id, scope, scope_ref)`. `scope` = `global \| habit \| category \| perfect \| quest` (CDC §40). `scope_ref` est `null` pour le Global Streak, sinon l'id de l'habitude ou le nom de catégorie. Seul le Global Streak est câblé dans `award-habit-xp` aujourd'hui — les autres scopes ont la colonne mais pas encore d'écriture.

---

## Tables — quêtes, coffres, battle pass

### `user_quests`
Une ligne par instance de quête assignée à un utilisateur pour une période (`period_start`/`period_end`). `status` : `active → completed → claimed`, ou `expired` si la période passe sans complétion.

### `chests`
`type` check sur les 5 raretés de coffre (CDC §74). `contents` jsonb rempli à l'ouverture, `null` avant.

### `battle_passes`
`unique(season_id, user_id)`. `claimed_tiers` jsonb = tableau des paliers déjà réclamés, pour éviter le double-claim.

---

## Tables — social

### `squads`, `squad_members`
`squad_members.role` check `leader \| officer \| member` (CDC §79). Pas de contrainte DB sur "max 20 membres" ou "max 3 squads/utilisateur" (CDC §78-79) — à valider côté Edge Function, pas en DB.

### `challenges`, `challenge_participants`
`challenges.scope` check `global \| community \| class \| friend` (CDC §83).

---

## Tables — journal, mood, audit

### `journal_entries`
`unique(user_id, entry_date)` — une entrée par jour (CDC §86).

### `mood_checkins`
`unique(user_id, checkin_date)`. Quatre dimensions 1-5 (CDC §87).

### `audit_logs`
CDC §128. Aucune policy RLS → inaccessible aux clients, y compris en lecture. Alimenté exclusivement par les Edge Functions pour les actions sensibles (achat, prestige, cadeau, ban).

---

## Tables ajoutées le 2026-08-28 (migrations séparées, hors le schéma initial ci-dessus)

- **`active_boosts`** (`20260828010000`) — XP Elixir/Feast actifs (CDC §25). `award-habit-xp` ne la requête pas encore (gap toujours ouvert, voir son header), mais la table existe désormais.
- **`user_skills`** (`20260828010100`) — allocation de Skill Points, PK composite `(user_id, skill_id)`, unlock à plat (pas de rangs). `skill_id` validé côté code (`game-engine/skills.ts`'s `SKILL_IDS`), pas par contrainte DB — même raisonnement que `achievements.condition` vs `packages/game-engine`.
- **`idempotency_keys`** — `unique(user_id, endpoint, key)`, aucun accès client (comme `audit_logs`). Alimentée par `_shared/idempotency.ts`.
- **`profiles.lifetime_xp`** (`20260828010300`, colonne ajoutée à `profiles`, pas une nouvelle table) — trouvé en implémentant `apply-prestige` : `total_xp` seul ne pouvait pas survivre à un reset de niveau sans se désynchroniser de `level`. `total_xp` = XP depuis le dernier Prestige (ce que lit le leveling) ; `lifetime_xp` = jamais reset (CDC §23-24).

## Ce qui manque volontairement (pas un oubli)

- **Sub-stats** (CDC §27, V1.5) — pas de table dédiée. Les 7 stats principales ont désormais un calcul (`game-engine/stats.ts`, 2026-08-28) mais toujours pas de table — calcul à la volée côté client à partir de `habits.linked_stats` × `habit_logs`, pas un problème d'intégrité anti-triche (voir le header du module).
- **Fragments Forge** (CDC §76) — `user_currency.fragments` existe et `open-chest` y écrit désormais (2026-08-28), mais aucune Edge Function de craft (dépenser des Fragments pour un item choisi).
- **Referral** (CDC §97), **Guilds** (V2), **Sound Pack / Notification Style cosmetics** (V2 extensions du §49) — non modélisés, phases ultérieures.
- **Achats permanents non-cosmétiques** (Recovery Day, slot d'habitude, respec de compétence — CDC §72) — aucune table/colonne ; `shop-purchase` (2026-08-28) est donc scopé aux cosmétiques seulement.
