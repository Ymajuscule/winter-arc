# Architecture technique

> Document complémentaire n°1 requis par le CDC (Annexe C). Détaille et illustre CDC §104-118 (amendé 2026-08-28 : pas de NestJS, pas de web companion). Pour le stack en un coup d'œil, voir `CLAUDE.md §3-4` ; pour le schéma DB, `docs/schema-postgresql.md` ; pour les contrats d'Edge Function, `docs/api-specifications.md`.

---

## 1. Vue d'ensemble

```
┌─────────────────────────┐
│   Expo app (iOS/Android) │
│   apps/mobile             │
│                            │
│  ┌──────────┐  ┌────────┐ │
│  │ Zustand  │  │TanStack│ │
│  │ (client) │  │ Query  │ │
│  └──────────┘  └───┬────┘ │
│                     │      │
│  ┌──────────────────▼───┐ │
│  │  Supabase JS client   │ │
│  └──────────┬─────────┬─┘ │
│             │         │   │
│      ┌──────▼───┐ ┌───▼──────┐
│      │  MMKV    │ │ sync     │
│      │ (local)  │ │ queue    │
│      └──────────┘ └──────────┘
└─────────────┼────────────┘
              │ HTTPS (JWT)
┌─────────────▼──────────────────────────────┐
│              Supabase project               │
│                                               │
│  ┌────────────┐  ┌────────────┐  ┌────────┐ │
│  │  Postgres  │◄─┤ Edge       │  │  Auth  │ │
│  │  + RLS     │  │ Functions  │  │        │ │
│  │            │  │ (Deno)     │  └────────┘ │
│  └─────┬──────┘  └─────┬──────┘  ┌────────┐ │
│        │               │         │Storage │ │
│  ┌─────▼──────┐  ┌─────▼──────┐  └────────┘ │
│  │ pg_cron    │  │ Realtime   │  ┌────────┐ │
│  │ (scheduled)│  │(broadcast) │  │PostHog │ │
│  └────────────┘  └────────────┘  │(client │ │
│                                    │ side)  │
└────────────────────────────────────┴────────┘
```

Un seul projet Supabase par environnement (local / staging / prod, voir §6). Pas de serveur applicatif à déployer, scaler, ou monitorer séparément — c'est le choix explicite de Julien du 2026-08-28, et la principale simplification par rapport à la v2.0 du CDC.

## 2. Le mobile ne calcule jamais l'XP officielle (CDC §127)

C'est la règle qui façonne toute l'architecture data :

1. Le mobile peut calculer un **aperçu optimiste** (même code que le serveur — `packages/game-engine` tourne des deux côtés) pour un retour visuel instantané.
2. La vraie écriture passe **toujours** par une Edge Function, qui utilise la clé service role (contourne RLS par construction).
3. RLS interdit à `authenticated` d'écrire directement sur les tables de jeu (`xp_transactions`, `user_currency`, `user_cosmetics`, `user_achievements`, `chests`, `battle_passes`) — voir `docs/schema-postgresql.md`.
4. Le mobile réconcilie son état optimiste avec la réponse de l'Edge Function ; en cas de divergence, le serveur gagne toujours.

Une Edge Function qui écrit une table de jeu **doit** utiliser `supabaseAdmin()` (`supabase/functions/_shared/supabase-admin.ts`) et vérifier l'identité de l'appelant via `getUserFromRequest()` — jamais faire confiance à un `user_id` dans le body.

## 3. Synchronisation offline-first (CDC §110)

```
Action utilisateur (tap sur une habitude)
        │
        ▼
Écriture locale immédiate (MMKV) — UI mise à jour tout de suite
        │
        ▼
Poussée dans la sync queue
        │
        ▼
Réseau disponible ? ──non──► reste en queue, retry avec backoff
        │ oui
        ▼
supabase.functions.invoke('award-habit-xp', { body, headers: { idempotency-key } })
        │
        ▼
Edge Function : calcule via game-engine, écrit habit_logs + xp_transactions
        │           + streaks + profiles (service role, contourne RLS)
        ▼
Réponse : { xpAwarded, level, streak, ... }
        │
        ▼
Store local réconcilié (TanStack Query invalide le cache concerné)
        │
        ▼
Supabase Realtime pousse tout changement externe pertinent
        (ex. un coéquipier de squad vient de dépasser l'utilisateur)
```

Idempotency : chaque appel d'Edge Function mutante devrait porter une clé d'idempotence pour survivre à un retry réseau sans double-compter — **pas encore implémenté**, gap à combler avant que la sync queue soit branchée pour de vrai (elle n'existe pas encore côté mobile, seule l'Edge Function existe).

## 4. Modèle de sécurité

| Surface | Mécanisme |
|---|---|
| Authentification | Supabase Auth — magic link + Apple/Google (Apple obligatoire App Store, CDC §10). JWT courte durée, refresh géré par le SDK client. |
| Autorisation lecture | RLS, par table (voir `docs/schema-postgresql.md`) |
| Autorisation écriture (jeu) | Aucune policy `authenticated` — uniquement le rôle service, utilisé exclusivement dans `supabase/functions/` |
| Secrets Edge Functions | `supabase secrets set` — jamais commités, jamais exposés au client |
| Secrets mobile | EAS secrets / variables d'environnement de build |
| Anti-triche | Cap XP quotidien (3 000, CDC §19), calcul XP côté serveur uniquement, détection de patterns suspects — voir CDC §127, pas encore implémentée au-delà du cap |
| RGPD | Voir CDC §125 — export de données, suppression de compte (soft delete + purge 30j), chiffrement au repos pour journal/mood. Pas encore implémenté ; c'est un gap Phase 1/2, pas Phase 0. |
| Audit | `audit_logs`, aucun accès client, alimenté par les Edge Functions pour les actions sensibles (CDC §128) |

## 5. Temps réel (CDC §111)

Supabase Realtime remplace Socket.io : Postgres Changes (écoute directe des tables, filtrée par RLS — un client ne reçoit que ce qu'il a le droit de lire) pour le feed de squad et les mouvements de leaderboard, ou des canaux `broadcast` pour des événements éphémères (encouragements en direct) qui n'ont pas besoin d'être persistés comme un changement de ligne. Pas encore câblé — V1, pas bloquant pour le MVP (CDC §111).

## 6. Environnements

| Env | Description |
|---|---|
| **local** | `supabase start` (CLI), Postgres local, migrations et seed appliqués en dev. Pas encore initialisé dans ce repo (`supabase init` reste à faire). |
| **staging** | Projet Supabase staging, données synthétiques. Julien applique les migrations/seed/functions lui-même (voir `supabase-ops` skill). |
| **production** | Projet Supabase distinct. Jamais touché automatiquement par une session Claude — CLAUDE.md §2 l'interdit explicitement ("Never deploy to production"). |

## 7. CI/CD (CDC §117)

```
Push sur night/YYYY-MM-DD-N
        │
        ▼
GitHub Actions (.github/workflows/ci.yml)
  ├─ pnpm install --frozen-lockfile
  ├─ pnpm typecheck   (turbo run typecheck, tous les packages/apps)
  ├─ pnpm lint         (Biome, tout le repo)
  └─ pnpm test         (Vitest — game-engine aujourd'hui, ui-primitives/mobile à venir)
        │
        ▼
[revue humaine — Julien pull la branche, teste sur device réel]
        │
        ▼ (si bon)
Merge manuel vers main (jamais automatique)
        │
        ▼
Déploiement manuel :
  - supabase db push / migrations appliquées par Julien
  - supabase functions deploy par Julien
  - EAS Build → TestFlight / Internal Testing
```

Pas de step de déploiement automatique dans `ci.yml` — conforme à CLAUDE.md §2 ("Never deploy to production", "Never push directly, only via night branches") et à l'instruction du 2026-08-28 sur le workflow Supabase.

## 8. Performance (CDC §116)

Voir le skill `mobile-performance` pour le détail actionnable. Cibles : cold start < 2.5s, feedback tactile < 100ms, 60 FPS sur iPhone 12/Pixel 6a, p95 Edge Function < 300ms, sync queue vidée < 2s en 4G.

## 9. Ce qui n'existe pas encore (honnête, pas un TODO générique)

- `supabase init` / stack Supabase locale — pas lancé dans ce repo.
- Idempotency keys sur les Edge Functions mutantes.
- pg_cron réel (rotation de quêtes, cutoff de Grace Period) — les fonctions sont spécifiées (`docs/api-specifications.md`) mais pas écrites.
- Supabase Realtime — aucun canal câblé.
- Export RGPD / suppression de compte.
- `supabase/functions` au-delà de `award-habit-xp` et `_shared/`.
