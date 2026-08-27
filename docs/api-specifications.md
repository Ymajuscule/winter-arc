# Spécifications API — Edge Functions

> Document complémentaire n°3 requis par le CDC (Annexe C). Il n'y a pas d'API REST maison (voir CDC §112) : le mobile parle à Supabase de deux façons — lecture directe via le client Supabase (RLS fait le filtrage, pas de spec nécessaire au-delà du schéma) et appel d'Edge Function pour toute écriture qui touche à l'intégrité du jeu. Ce document spécifie ces Edge Functions, une par une, qu'elles soient déjà écrites ou non.
>
> Convention : `Deno.serve` reçoit une requête `POST` (sauf `OPTIONS` pour le CORS preflight), `Authorization: Bearer <jwt>` obligatoire, body JSON. Réponses via `jsonResponse()` (`supabase/functions/_shared/cors.ts`) — toujours `{ ...payload }` en succès, `{ error: string }` avec un code HTTP adapté en échec. Auth vérifiée via `getUserFromRequest()` (`_shared/supabase-admin.ts`) — jamais faire confiance à un `user_id` passé dans le body.

---

## ✅ Implémentée — `award-habit-xp`

Voir `supabase/functions/award-habit-xp/index.ts`. Le cœur de la boucle Phase 1 (CDC §31-32, §17-21).

**Requête**
```ts
POST /functions/v1/award-habit-xp
Authorization: Bearer <user JWT>

{
  "habitId": "uuid",
  "loggedFor": "2026-08-28",   // YYYY-MM-DD
  "value"?: number             // requis pour numeric/duration/counter/distance
}
```

**Réponse 200**
```ts
{
  "xpAwarded": number,
  "completionPct": number,       // 0-100
  "multiplier": number,          // ex. 1.35
  "dailyXpCap": 3000,
  "level": {
    "level": number,
    "totalXp": number,
    "xpIntoLevel": number,
    "xpToNextLevel": number,
    "xpForNextLevel": number
  },
  "streak": { "kind": "extended" | "already_logged_today" | "frozen" | "broken", "state": {...} }
}
```

**Erreurs**
| Code | Cas |
|---|---|
| 401 | JWT absent/invalide |
| 400 | `habitId`/`loggedFor` manquant |
| 404 | Habitude introuvable, n'appartient pas à l'utilisateur, ou profil introuvable |
| 409 | Déjà loggée pour ce `loggedFor` (contrainte `unique(habit_id, logged_for)`) |
| 500 | Échec d'écriture `habit_logs` |

**Gaps connus** (documentés dans le header du fichier, pas cachés) : `isPerfectDay`, boosts XP actifs, événements de saison sont forcés à `false` faute de la donnée sous-jacente ; `isEarlyBird` utilise l'heure UTC en attendant un fuseau horaire par utilisateur ; le seuil de streak est en dur à 60 au lieu de dépendre de la difficulté de l'Arc.

---

## 🔲 Spécifiées, pas encore écrites

### `claim-quest`
CDC §33-36. Réclame une quête (daily/weekly/monthly/boss) dont la progression est complète.

```ts
POST /functions/v1/claim-quest
{ "userQuestId": "uuid" }

// 200
{ "xpAwarded": number, "coinsAwarded": number, "cosmeticAwarded": string | null, "level": LevelProgress }
// 409 si déjà réclamée ou progression < 100%
// 404 si la quête n'existe pas ou n'appartient pas à l'utilisateur
```
Dépend d'un moteur de progression de quête pas encore écrit (`quest_definitions.condition` n'a pas de DSL formalisé — contrairement à `achievements.condition`, voir gap dans TODO.md).

### `evaluate-achievements`
CDC §44-48. Appelée en interne par les autres fonctions (pas directement par le mobile) après tout événement qui pourrait débloquer un achievement — complétion d'habitude, claim de quête, avancement de streak, prestige.

```ts
// Appel interne (function-to-function), pas de route publique
evaluateNewlyUnlockedAchievements(allAchievements, alreadyUnlockedIds, ctx: AchievementEvalContext)
// → string[] d'ids nouvellement débloqués, à insérer dans user_achievements
// et dont le cosmetic_reward (si non-null) doit aussi rejoindre user_cosmetics
```
La logique pure existe déjà (`packages/game-engine/src/achievements.ts`) — il manque le code Edge Function qui construit `AchievementEvalContext` à partir des tables (requêtes d'agrégation sur `habit_logs`, `streaks`, `user_achievements`, etc.) et l'appelle.

### `advance-streak`
CDC §40-43. Job planifié (pg_cron), pas un appel client — clôture la journée pour tous les utilisateurs après la Grace Period (00:00-03:00, CDC §42), appelle `advanceStreak()` (`game-engine/streaks.ts`) par utilisateur actif, écrit les milestones (CDC §41) atteints comme `xp_transactions` + `user_achievements` s'il y a un achievement correspondant.

Distinct de la mise à jour de streak qui se produit *dans* `award-habit-xp` au moment de la complétion — celle-ci gère le cas où l'utilisateur n'ouvre pas l'app du tout un jour donné.

### `apply-prestige`
CDC §23-24.
```ts
POST /functions/v1/apply-prestige
{}  // pas de payload, agit sur l'utilisateur authentifié

// 200
{ "prestigeRank": number, "lifetimeXp": number, "isLegend": boolean }
// 409 si canPrestige() (game-engine/prestige.ts) est false
```
Doit aussi : reset `profiles.level` à 1, débloquer le cadre/titre de Prestige correspondant dans `user_cosmetics`, journaliser dans `audit_logs` (action sensible, CDC §128).

### `spend-skill-point`
CDC §22. Non spécifié plus finement : l'arbre de talents à 4 branches (Body/Mind/Spirit/Fortune) n'a pas encore de représentation en base — `profiles.skill_points` compte les points disponibles mais rien ne modélise où ils sont alloués. À concevoir avant d'écrire cette fonction (probablement une table `user_skills` — pas encore dans le schéma, gap ouvert).

### `open-chest`
CDC §74. Roll pondéré par rareté selon `chests.type`, anti-doublon → conversion en Fragments (`user_currency.fragments`, CDC §76) si l'item est déjà possédé.
```ts
POST /functions/v1/open-chest
{ "chestId": "uuid" }

// 200
{ "items": Array<{ cosmeticId: string, isDuplicate: boolean, fragmentsAwarded?: number }> }
// 409 si déjà ouvert
```
Table de probabilités par rareté/type de coffre pas encore définie (CDC §74 donne les raretés possibles par coffre, pas les pourcentages exacts) — à trancher avant l'implémentation, candidat `DECISION-NEEDED` si Julien a une préférence précise, sinon valeurs raisonnables à documenter dans le code.

### `shop-purchase`
CDC §72-73. Débite `coins`/`embers`, crédite `user_cosmetics` ou l'item permanent acheté (Recovery Day, slot d'habitude...).

### `battle-pass-claim-tier`
CDC §101. V1 — pas avant que `battle_passes`/`seasons` aient du contenu réel.

### `squad-quest-progress`
CDC §80. V1.

### `rotate-quests` (pg_cron)
CDC §33-35. Génère les `user_quests` du jour/de la semaine/du mois à partir de `quest_definitions`, personnalisées par habitudes actives/classe/stats sous-alimentées (CDC §33) — logique de sélection non triviale, pas encore conçue.

### `grace-period-cutoff` (pg_cron)
CDC §42. Déclenche `advance-streak` pour les utilisateurs qui n'ont pas loggé avant la fin de la Grace Period.

### `verify-iap-receipt`
CDC §122. Vérifie un reçu Apple/Google, active Premium ou le Battle Pass premium. Phase 2 — pas avant que le modèle d'abonnement (CDC §120) ait une table dédiée.

---

## Unlock methods (`cosmetics.unlock_method`, `supabase/seed/002_cosmetics.sql`)

Schéma libre (jsonb, pas de DSL strict comme `AchievementCondition`) car les cosmétiques se débloquent par 9 canaux différents (CDC §64), pas seulement des conditions de jeu :

| `type` | Exemple | Sens |
|---|---|---|
| `onboarding` | `{"type":"onboarding"}` | Donné pendant l'onboarding |
| `level` | `{"type":"level","level":25}` | Niveau atteint |
| `streak` | `{"type":"streak","days":30,"scope":"global"}` | Streak atteint |
| `class` | `{"type":"class","classId":"ranger","level":10}` | Niveau dans une classe |
| `achievement` | `{"type":"achievement","achievementId":"iron-discipline"}` | Achievement débloqué |
| `shop` | `{"type":"shop"}` | Achetable (voir `coin_price`/`ember_price`) |
| `boss_defeated` | `{"type":"boss_defeated","scope":"arc"}` | Boss vaincu |
| `arc_completed` | `{"type":"arc_completed","minCompletionPct":90}` | Arc terminé au-dessus d'un seuil |

Ce n'est **pas** une contrainte de clé étrangère — `achievementId` n'est pas vérifié par Postgres, c'est une métadonnée d'affichage ("comment débloquer") consommée côté client pour l'écran Cosmetics (CDC §62). L'unlock réel se produit dans les Edge Functions correspondantes (`award-habit-xp` écrit dans `user_cosmetics` quand un niveau/streak franchit un seuil qui a un cosmétique associé — logique pas encore écrite, gap ouvert au même titre que `evaluate-achievements`).
