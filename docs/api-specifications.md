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

**Gaps connus** (documentés dans le header du fichier, pas cachés) : `isPerfectDay`, boosts XP actifs (la table `active_boosts` existe désormais mais n'est pas encore requêtée ici), événements de saison sont forcés à `false` faute de la donnée sous-jacente ; `isEarlyBird` utilise l'heure UTC en attendant un fuseau horaire par utilisateur. Le seuil de streak lit désormais `profiles.difficulty` via `STREAK_THRESHOLD_BY_DIFFICULTY` (2026-08-28, n'est plus en dur).

Depuis le 2026-08-28 : enveloppée dans `withIdempotency` (`Idempotency-Key` header optionnel) et appelle `evaluateAndUnlockAchievements` après l'écriture du streak — la réponse a un champ `achievements` en plus.

---

## ✅ Implémentées (2026-08-28) — écrites, non déployées

### `claim-quest`
CDC §33-36. Réclame une quête (daily/weekly/monthly/boss) dont la progression est complète. Recalcule la progression côté serveur avant de payer (`_shared/quest-progress.ts`, jamais de confiance dans une prétention client).

```ts
POST /functions/v1/claim-quest
{ "userQuestId": "uuid" }

// 200
{ "xpAwarded": number, "coinsAwarded": number, "cosmeticAwarded": string | null, "level": LevelProgress, "achievements": AchievementUnlockResult }
// 409 si déjà réclamée ou progression < 100% (le body inclut alors "progress")
// 404 si la quête n'existe pas ou n'appartient pas à l'utilisateur
```
Le moteur de progression existe (`game-engine/quests.ts` + `_shared/quest-progress.ts`). Ce qui manque encore : `rotate-quests` (le cron qui *assigne* des instances de quête aux utilisateurs chaque période) — `claim-quest` peut réclamer une quête déjà assignée, mais rien n'assigne encore automatiquement.

### `evaluate-achievements`
CDC §44-48. **Décision** (2026-08-28, CLAUDE.md §8 catégorie 2) : implémentée comme helper partagé (`_shared/evaluate-achievements.ts`), pas comme fonction déployée séparément — deux déploiements Deno ne partagent pas de mémoire process, et un appel HTTP function-to-function pour ça serait plus lent sans bénéfice. Appelée directement par `award-habit-xp` et `claim-quest`.

```ts
evaluateAndUnlockAchievements(userId: string): Promise<AchievementUnlockResult>
// → { newlyUnlockedIds, xpAwarded, coinsAwarded, cosmeticIdsGranted }
// Insère user_achievements, crédite xp_reward/coins_reward, insère user_cosmetics
// pour tout cosmetic_reward non-null.
```
Plusieurs champs du contexte sont des gaps de schéma documentés (pas de table de tracking par "metric", pas de table encouragements/vainqueurs de challenge) — voir le header du fichier pour la liste complète et pourquoi chacun est à une valeur par défaut qui ne peut jamais déclencher un faux déblocage.

### `advance-streak`
CDC §40-43. Job planifié (pg_cron), pas un appel client — clôture la journée pour les utilisateurs qui n'ont pas ouvert l'app du tout, après la Grace Period (00:00-03:00, CDC §42). Auth par secret partagé (`CRON_SECRET` + header `X-Cron-Secret`), pas de JWT utilisateur. Écrit les milestones (CDC §41) atteints comme `xp_transactions`.

Distinct de la mise à jour de streak qui se produit *dans* `award-habit-xp` au moment de la complétion. **Reste à faire côté Supabase (pas un fichier)** : Julien configure le secret `CRON_SECRET` et le job pg_cron lui-même.

### `apply-prestige`
CDC §23-24.
```ts
POST /functions/v1/apply-prestige
{}  // pas de payload, agit sur l'utilisateur authentifié

// 200
{ "prestigeRank": number, "lifetimeXp": number, "isLegend": boolean }
// 409 si canPrestige() (game-engine/prestige.ts) est false
```
Reset `profiles.level` à 1, journalise dans `audit_logs` (action sensible, CDC §128). A nécessité une vraie correction de schéma trouvée en l'implémentant : `profiles.lifetime_xp` (migration `20260828010300`) — voir le header du fichier et SESSION-LOG.md pour le détail. **Portée volontairement limitée** : le "choix de bonus permanent au moment du Prestige" (CDC §23) n'est pas géré — aucun payload/catalogue de bonus prestige n'existe encore pour ça.

### `spend-skill-point`
CDC §22. Catalogue de talents désormais réel (`game-engine/skills.ts`, 16 nœuds, 4 branches) et table `user_skills` (migration `20260828010100`) — mais la fonction elle-même (allocation + respec payant/gratuit par saison) n'est pas encore écrite.

### `open-chest`
CDC §74. Roll pondéré par rareté (`game-engine/chests.ts`, `rollChestRarities`), anti-doublon → conversion en Fragments (`user_currency.fragments`, CDC §76) si l'item est déjà possédé.
```ts
POST /functions/v1/open-chest
{ "chestId": "uuid" }

// 200
{ "items": Array<{ cosmeticId: string, isDuplicate: boolean, fragmentsAwarded?: number }> }
// 409 si déjà ouvert
```
Les pourcentages exacts par rareté/type de coffre ont été tranchés directement (2026-08-28) plutôt qu'escaladés — voir `game-engine/chests.ts` pour les valeurs et leur justification, faciles à retoucher plus tard.

### `shop-purchase`
CDC §72-73. **Portée limitée aux cosmétiques** (le cas entièrement modélisé) : débite `coins`/`embers`, crédite `user_cosmetics`. Les achats permanents non-cosmétiques du CDC §72 (Recovery Day, slot d'habitude, respec de compétence) n'ont aucune table/colonne dédiée dans le schéma — `DECISION-NEEDED` sur où ça vivrait (compteur sur `profiles` ? table générique `permanent_purchases` ?) avant de pouvoir les implémenter.

---

## 🔲 Spécifiées, pas encore écrites

### `battle-pass-claim-tier`
CDC §101. V1 — pas avant que `battle_passes`/`seasons` aient du contenu réel.

### `squad-quest-progress`
CDC §80. V1.

### `rotate-quests` (pg_cron)
CDC §33-35. Génère les `user_quests` du jour/de la semaine/du mois à partir de `quest_definitions`, personnalisées par habitudes actives/classe/stats sous-alimentées (CDC §33) — logique de sélection non triviale, pas encore conçue.

### `grace-period-cutoff` (pg_cron)
CDC §42. **Superseded (2026-08-28)** — `advance-streak` (implémentée, voir plus haut) fait déjà ce travail directement : elle boucle sur tous les streaks globaux et ne traite que ceux pas encore avancés "aujourd'hui", ce qui *est* le filtre Grace Period. Pas de fonction séparée à écrire pour ça.

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

Ce n'est **pas** une contrainte de clé étrangère — `achievementId` n'est pas vérifié par Postgres, c'est une métadonnée d'affichage ("comment débloquer") consommée côté client pour l'écran Cosmetics (CDC §62). L'unlock via `achievement` fonctionne désormais (`evaluate-achievements`, 2026-08-28). L'unlock via `level`/`streak` directement (pas d'achievement intermédiaire — ex. `frame-obsidian` au niveau 100) reste un gap ouvert : `award-habit-xp` met à jour le niveau/streak mais ne consulte pas encore `cosmetics.unlock_method` pour accorder automatiquement ce qui vient de devenir atteignable.
