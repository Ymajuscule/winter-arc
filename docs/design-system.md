# Design System complet

> Document complémentaire n°4 requis par le CDC (Annexe C). Réunit les tokens (`packages/ui-primitives/src/tokens.ts`), les composants existants, les patterns d'animation, et ce qui reste à construire — la référence complète derrière `CLAUDE.md §5` et le skill `cinematic-ui`/`winter-arc-design-system`. Pas de Storybook pour l'instant (pas de tâche Phase 0/1 dédiée) ; ce document en tient lieu en attendant.

---

## 1. Palette Frost (canonique)

```ts
export const frost = {
  void:     '#05070A', // fond de page
  obsidian: '#0B0F14', // surface élevée
  graphite: '#161B22', // fond de carte
  fog:      '#8A94A6', // texte secondaire
  ghost:    '#C7CFDB', // texte principal sur fond sombre
  bone:     '#EAEEF5', // texte pur, usage rare
  ice:      '#7FB7D9', // accent principal (XP, focus)
  glacier:  '#4A90B8', // pressed / actif
  ember:    '#E85D3B', // flamme de streak, rare
  blood:    '#8B1A1A', // état d'échec, très rare
  aurora:   '#7B5CFF', // prestige / cosmétique légendaire
};
```

Jamais de `#FFFFFF` ni `#000000` purs. Jamais de couleur hors de cette table — si une valeur manque, c'est un token à ajouter, pas un hex à écrire en dur (voir le skill `winter-arc-design-system`).

## 2. Palettes alternatives (CDC §9 Écran 4, §57)

`packages/ui-primitives/src/tokens.ts` exporte `palettes` — 6 variantes de `frost` avec `ice`/`glacier` substitués :

| Palette | Accent (`ice`) | Débloquée |
|---|---|---|
| `frost` | `#7FB7D9` (bleu glacé) | Défaut, onboarding |
| `ember` | `#E85D3B` | Onboarding (choix) |
| `void` | `#7B5CFF` | Onboarding (choix) |
| `forest` | `#5FBF8F` | Onboarding (choix) |
| `blood` | `#C24545` | Onboarding (choix) |
| `solar` | `#D9B24A` | Onboarding (choix) |

Note : ce sont les 6 palettes *personnelles* choisies à l'onboarding (CDC §9 Écran 4). Les *thèmes* débloquables plus tard (CDC §57 — Midnight, Aurora, Cyberpunk, Origin, Custom) sont un système voisin mais distinct, pas encore modélisé dans `tokens.ts` — ils vivent aujourd'hui comme des lignes dans `cosmetics` (catégorie `theme`, voir `supabase/seed/002_cosmetics.sql`) sans encore de valeurs de tokens associées.

## 3. Espacement, rayons, bordures

```ts
spacing = { none: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32, '3xl': 48, '4xl': 64 };
radii   = { none: 0, sm: 2, full: 9999 };  // pas de rounded-2xl — voir Design Law règle 1
border  = { width: 0.5, color: 'rgba(255,255,255,0.08)' };  // hairline, jamais 1px solid
```

`radii.full` est réservé aux avatars, orbes, pills de statut (Design Law règle 1) — jamais une carte.

## 4. Typographie

```ts
fontFamily = {
  mono: 'JetBrainsMono-Regular', monoMedium: 'JetBrainsMono-Medium',
  display: 'NeueHaasDisplay-Bold', displayFallback: 'InterTight-Bold',
  body: 'Inter-Regular', bodyMedium: 'Inter-Medium',
};
size = { label: 11, body: 14, title: 20, display: 32, hero: 48 };
tracking = { label: 0.8, tight: -0.02, normal: 0 };
```

- **Mono** (JetBrains Mono) : tous les nombres/données — niveau, XP, streak, dates. Jamais une police proportionnelle pour un chiffre qui doit "avoir l'air mécanique".
- **Display** (Neue Haas Grotesk Display, repli Inter Tight) : titres, headers d'écran.
- **Body** (Inter, 14px) : texte courant.
- **`hero`** : la taille des gros nombres kernés serré (Design Law règle 7) — niveau, XP, streak en grand sur le dashboard.
- **Jamais `system-ui`.** Aucune exception.

Statut actuel : les fichiers de police (`.otf`/`.ttf`) ne sont pas encore ajoutés à `apps/mobile/assets/` ni chargés via `expo-font` — `Text.tsx` référence les noms de famille mais ils ne résolvent encore à rien de chargé. Gap Phase 0/1 à combler avant que `Text` affiche vraiment autre chose que la police système par défaut de la plateforme (ce qui viole la Design Law tant que ce n'est pas fait).

## 5. Motion

```ts
easing = {
  outExpo: [0.22, 1, 0.36, 1],  // entrées
  inExpo:  [0.7, 0, 0.84, 0],   // sorties
};
duration = { micro: 180, panel: 320, hero: 640 };  // ms
```

Rien ne rebondit — pas de physique à ressort, sauf l'orbe XP qui s'absorbe dans la barre (l'unique exception délibérée, voir skill `cinematic-ui`). Utiliser Reanimated 4 worklets pour toute animation pilotée par geste ou continue — jamais un `setState` en boucle.

## 6. Composants existants (`packages/ui-primitives`)

| Composant | Rôle | Statut |
|---|---|---|
| `Surface` | Fond plat, variantes `void \| obsidian \| graphite` | ✅ Implémenté |
| `Hairline` | Séparateur, seul type de bordure autorisé | ✅ Implémenté |
| `Text` | Variantes `display \| title \| body \| mono \| label \| hero` | ✅ Implémenté (polices pas encore chargées, voir §4) |
| `XPOrb` | Orbe qui s'absorbe dans la barre XP, la seule animation à ressort | 🔲 Placeholder prévu, pas écrit |
| `Frame`, `Aura` | Rendu des cosmétiques cadre/aura (Skia, CDC §51-52) | 🔲 Pas écrit |
| `StreakFlame` | 8 paliers visuels selon la longueur du streak (CDC §58) | 🔲 Pas écrit |
| `XPBar`, `LevelBadge` | Styles multiples débloquables (CDC §59-60) | 🔲 Pas écrit |
| `Nameplate`, `Emblem`, `Sigil` | CDC §54-56 | 🔲 Pas écrit |

Tout composant qui rend un morceau de Loadout doit vivre ici, pas dans `apps/mobile` — il est réutilisé dans le header du dashboard, l'éditeur de profil, le feed de squad, et les cartes de partage social (CDC §68 : "aucun cosmétique n'est purement décoratif", donc chacun apparaît à plusieurs endroits).

## 7. Nativewind

Pas encore câblé (pas de config metro/babel/tailwind dans `apps/mobile`). Les composants actuels utilisent `StyleSheet.create` alimenté par les tokens — ça respecte "les tokens font loi" (l'exigence réelle de la Design Law) sans passer par des classes utilitaires. Si/quand Nativewind est configuré, les tokens de ce document deviennent le thème Tailwind — un seul système de vérité, pas deux qui divergent.

## 8. Reject list (rappel — détail complet dans le skill `cinematic-ui`)

Cartes arrondies avec ombre douce, CTA dégradé violet-rose, boutons "Get Started →" animés, bento grids, glassmorphism (sauf backdrop de modal ≤12% opacité), skeleton loaders qui scintillent, illustrations souriantes, emoji comme chrome UI, "Streak 🔥 7 jours !" au lieu de `07 :: STREAK`.

## 9. Auto-revue avant tout commit UI

Les cinq questions du skill `cinematic-ui` : est-ce que ça ressemble à un film de Villeneuve ou à un template Vercel ? Police/ombre/rayon par défaut quelque part ? Dégradé hors barre de progression/orbe XP ? Ça survivrait à une capture d'écran sans légende ? Le texte seul (sans icônes) reste-t-il froid et précis, ou sonne-t-il comme un texte d'app générique ?
