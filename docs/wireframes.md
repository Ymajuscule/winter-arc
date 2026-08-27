# Wireframes / maquettes fonctionnelles

> Document complémentaire n°5 requis par le CDC (Annexe C: "chaque écran, tous les états — loading, empty, error, success, offline, level up, achievement unlock, etc."). Pas d'accès à Figma depuis cette session — ce sont des wireframes textuels (layout + états), suffisants pour driver l'implémentation ; à remplacer par de vraies maquettes visuelles dès qu'un outil de design est branché.
>
> Portée : les écrans du Phase 1 MVP (CDC §135) — les 13 écrans d'onboarding (§9), le dashboard et sa boucle quotidienne (§14-16), l'expérience de comeback (§43). Les écrans Phase 2+ (shop, coffres, squad, battle pass...) seront wireframés quand leur phase démarre — les esquisser maintenant risquerait de figer des détails que Phase 1 n'a pas encore validés.
>
> Toutes les couleurs/espacements référencés sont les tokens de `docs/design-system.md` — un wireframe qui utilise une valeur hors tokens est un bug de wireframe, pas juste de code.

---

## Conventions de lecture

```
┌─────────────────────┐   Cadre = un écran (safe area incluse)
│ ZONE                │   ZONE en majuscules = un bloc fonctionnel
│ [Élément]            │   [texte] = un composant interactif
│ "texte affiché"      │   "..." = copie exacte ou exemple
└─────────────────────┘
```

États couverts par écran quand applicable : **Loading**, **Empty**, **Error**, **Success** (le cas nominal, détaillé en premier), **Offline**, plus les overlays transverses (**Level Up**, **Achievement Unlock**) documentés une fois à la fin (§ Overlays transverses) car ils peuvent apparaître par-dessus n'importe quel écran.

---

## Onboarding (CDC §9)

### Écran 1 — Splash / Welcome

```
┌─────────────────────┐
│                      │
│    [Video loop 3-5s] │  void background, silhouette, glow ice
│                      │
│   "Build your        │  display, bone
│    Winter Arc."       │
│   "Transform your     │  body, fog
│    next 90 days."     │
│                      │
│   [ Get Started ]     │  primary CTA
│   [ Sign In ]         │  secondary, ghost text
└─────────────────────┘
```
- **Loading** : la vidéo n'a pas fini de charger → fond `void` uni, pas de spinner (Design Law : pas de skeleton qui scintille), le texte et les CTA apparaissent immédiatement, la vidéo se pose derrière une fois prête.
- **Offline** : identique — aucun appel réseau sur cet écran.
- **Error** : n/a — écran statique.

### Écran 2 — Manifeste

```
┌─────────────────────┐
│                      │
│  "Ta vie n'est pas    │  body, ghost, centré, une ligne à la fois
│   un jeu.              │  révélée (respecte "Reduce Motion" :
│   Mais elle en suit     │  fallback = tout affiché d'un coup)
│   les règles.           │
│   Chaque action        │
│   compte.               │
│   Chaque jour te        │
│   transforme.           │
│   Bienvenue dans        │
│   ton Arc."             │
│                      │
│      [ Continue ]     │
└─────────────────────┘
```

### Écran 3 — Avatar

```
┌─────────────────────┐
│ "Choose your start"  │  label
│                      │
│  ○ ○ ○ ○           │  grille 3-4 colonnes, 12 avatars
│  ○ [●] ○ ○          │  (● = sélectionné, ring ice)
│  ○ ○ ○ ○           │
│                      │
│ "The Warrior"         │  nom + description courte de
│ "Disciplined, direct." │  l'avatar sélectionné
│                      │
│      [ Continue ]     │  désactivé tant que rien n'est choisi
└─────────────────────┘
```
- **Loading** : catalogue de 12 avatars pas encore reçu → grille de 12 placeholders `graphite` unis (pas de shimmer), pas de blocage — les avatars sont un seed statique, ce chargement devrait être quasi instantané en pratique.
- **Empty/Error** : le catalogue est un seed embarqué, pas un cas réaliste — si l'appel échoue quand même, fallback sur un set minimal de 3 avatars codés en dur plutôt que de bloquer l'onboarding.

### Écran 4 — Palette

```
┌─────────────────────┐
│ "Pick your colors"   │
│                      │
│  ⬤ Frost  ⬤ Ember     │  6 pastilles de couleur, tap = preview
│  ⬤ Void   ⬤ Forest    │  live sur TOUT l'écran (fond, accents)
│  ⬤ Blood  ⬤ Solar      │  change instantanément
│                      │
│      [ Continue ]     │
└─────────────────────┘
```
Aucun état réseau — les 6 palettes sont locales (`packages/ui-primitives/src/tokens.ts`).

### Écran 5 — Nom & Pseudo

```
┌─────────────────────┐
│ "First name"          │  input, privé
│ [___________]         │
│                      │
│ "Username"             │  input, public
│ [___________]         │  vérification en live
│ ✓ available            │  ou "✗ taken" en blood
│                      │
│      [ Continue ]     │  désactivé si username invalide/pris
└─────────────────────┘
```
- **Loading** : vérification d'unicité en vol → un simple indicateur textuel discret (pas de spinner visuel intrusif), debounce ~400ms sur la frappe.
- **Error** : "✗ taken" en `blood`, ou message réseau générique si l'appel échoue — jamais bloquer la saisie, juste désactiver Continue.
- **Offline** : impossible de vérifier l'unicité → message clair ("Connecte-toi pour continuer"), Continue reste désactivé (contrairement au Mode Démo, CDC §13, qui est un chemin séparé sans compte).

### Écran 6 — Domaines

```
┌─────────────────────┐
│ "What do you want     │
│  to improve?"          │
│ "Select 2-6"           │  label, fog
│                      │
│ [💪 Fitness] [🧠 Mind]  │  chips multi-select
│ [📚 Knowledge] [💼 Career]
│ [💰 Finance] [😴 Sleep]
│ [🥗 Nutrition] [⚡ Energy]
│ [📵 Digital] [🧘 Mental]
│ [🎨 Creative] [🤝 Relations]
│                      │
│      [ Continue ]     │  désactivé si <2 ou >6 sélectionnés
└─────────────────────┘
```
Note design : le CDC liste ces domaines avec des emoji dans sa propre copie (§9 Écran 6) — c'est un choix produit explicite du CDC pour ce sélecteur de domaines spécifiquement, pas une exception générale à la règle "pas d'emoji en UI" (Design Law règle 3). Sur cet écran précis, suivre le CDC ; partout ailleurs, icônes SVG.

### Écran 7 — Objectifs par domaine

```
┌─────────────────────┐
│ "Fitness — pick 1-3"  │  un écran/carte par domaine sélectionné,
│                      │  navigation swipe ou pagination
│ ☐ Run 3x/week          │
│ ☐ Strength training 2x │
│ ☐ 10k steps/day         │
│ ☐ Custom: [_______]    │
│                      │
│  ● ○ ○  (3 domains)   │  indicateur de progression
│      [ Continue ]     │
└─────────────────────┘
```

### Écran 8 — Habitudes suggérées

```
┌─────────────────────┐
│ "Your habits"          │
│ "We picked these based│
│  on your goals"        │
│                      │
│ ☑ Morning workout       │  liste éditable, 7-10 items
│ ☑ Read 20 min            │  swipe pour retirer, tap pour éditer
│ ☑ Meditate 10 min         │
│ ☐ Cold shower              │
│ [+ Add habit]           │
│                      │
│      [ Continue ]     │
└─────────────────────┘
```

### Écran 9 — Difficulté

```
┌─────────────────────┐
│ "How hard do you       │
│  want this to be?"      │
│                      │
│ ( ) Easy    — 60%        │  radio, une seule sélection
│ ( ) Normal  — 75%          │
│ (●) Hard    — 85%           │
│ ( ) Extreme — 95%            │  copie d'avertissement en ember
│     "One missed day breaks    │  si Extreme sélectionné :
│      your streak, no grace."   │
│                      │
│      [ Continue ]     │
└─────────────────────┘
```

### Écran 10 — Classe

```
┌─────────────────────┐
│ "Suggested class"      │
│                      │
│   ⚔️ WARRIOR              │  suggestion basée sur les domaines,
│   "+15% XP on fitness"    │  gros, centré
│                      │
│ [ Accept ]  [ Choose      │  accept ou ouvre la liste des 7
│              another ]     │
│ [ Stay Wanderer ]           │  option "sans classe"
└─────────────────────┘
```

### Écran 11 — Récapitulatif de l'Arc

```
┌─────────────────────┐
│ "YOUR WINTER ARC"      │  mono, label, tracked
│ "Oct 1 → Dec 30"        │  mono, hero-adjacent
│ "90 DAYS"                │
│                      │
│ Focus                  │
│ 💪 Fitness · 🧠 Discipline│
│                      │
│ Class    ⚔️ WARRIOR        │
│ Difficulty ████████░░ HARD│
│                      │
│ Habits: 8               │
│ Weekly Quests: 3         │
│ Monthly Boss: 1          │
│                      │
│      [ Begin ]        │
└─────────────────────┘
```
Écran purement de confirmation, aucun état réseau bloquant — les données viennent des écrans précédents, déjà en mémoire locale.

### Écran 12 — Permissions

```
┌─────────────────────┐
│ "Stay on track"         │
│                      │
│ 🔔 Notifications         │  obligatoire pour continuer
│    [ Enable ]             │  (CDC §9: "obligatoire pour
│                      │       l'expérience")
│ ⌚ Health (optional)       │
│    [ Enable ]  [ Skip ]     │
│                      │
│      [ Continue ]     │  désactivé tant que Notifications
│                      │  n'a pas été traité (accepté OU refusé
│                      │  via le prompt système — pas bloqué
│                      │  indéfiniment si l'utilisateur refuse)
└─────────────────────┘
```

### Écran 13 — Première récompense

```
┌─────────────────────┐
│                      │
│   [Unlock animation]   │  plein écran, 640ms hero timing
│                      │
│  Title: "The Awakened"  │  révélation séquentielle
│  Frame: Iron Frame       │
│  Achievement: Day Zero   │
│                      │
│      [ Enter ]        │  → dashboard
└─────────────────────┘
```
- **Error** : si l'attribution de la récompense de départ échoue côté serveur (pas encore d'Edge Function dédiée — gap ouvert), ne jamais bloquer l'entrée dans l'app sur cet échec ; logger et laisser `[Enter]` actif, rattraper la récompense au prochain lancement plutôt que de coincer l'utilisateur sur l'onboarding.

---

## Dashboard & boucle quotidienne (CDC §14-16)

### Dashboard — cas nominal

```
┌─────────────────────┐
│ [Avatar+Frame] Julien   │  ZONE 1 — header
│ "The Constant"          │
│ LVL 24 ████████░░ 6820/8000│
│ 🔥 18                    │
│                      │
│ TODAY                    │  ZONE 2 — hero
│ 78% COMPLETE              │
│ ████████████████░░░░       │
│ +340 XP EARNED TODAY        │
│                      │
│ MORNING                    │  ZONE 3 — habitudes,
│ ✓ Workout    +40 XP         │  groupées par période
│ ○ Meditation  +20 XP         │
│ AFTERNOON                    │
│ ○ Deep Work   +75 XP          │
│                      │
│ DAILY QUESTS (2/3)             │  ZONE 4
│ ...                              │
│ WEEKLY  ●●●○○ 3/5 days           │  ZONE 5
│ BOSS  ▓▓▓▓░░░░ 12/30 days          │  ZONE 6, si actif
└─────────────────────┘
```
- **Loading** (premier chargement, cache MMKV vide) : header et Zone 2 rendus depuis le dernier état connu si offline-first a déjà une valeur ; sinon squelette simple (blocs `graphite` plats, sans shimmer — Design Law) pendant le premier fetch.
- **Empty** : aucune habitude configurée (ne devrait pas arriver après l'onboarding, mais un utilisateur peut tout désactiver) → Zone 3 affiche une ligne, un divers fin, une phrase ("No habits today.") et un lien vers la gestion des habitudes — pas d'illustration (Design Law règle 8, "Silence is a component").
- **Error** : échec du fetch de l'état du jour → afficher le dernier état local connu (offline-first) avec un indicateur discret "not synced" en `fog`, jamais un écran d'erreur plein cran qui bloque l'usage.
- **Offline** : identique à Error côté affichage — toute action (compléter une habitude) reste possible, part dans la sync queue.
- **Success (complétion d'habitude)** : voir Overlays transverses ci-dessous pour le popup XP flottant.

### Day Recap (CDC §16)

```
┌─────────────────────┐
│ "DAY RECAP — OCT 24"   │
│ ──────────────         │
│ ✓ 8 / 10 habits          │
│ +680 XP                   │
│ 🔥 Streak: 19 days          │
│                      │
│ Stats: Strength +5,        │
│        Discipline +8        │
│                      │
│ Best moment: Workout       │
│  at 07:15                   │
│ Missed: Meditation,          │
│         Water goal            │
│                      │
│ Tomorrow's focus:              │
│  Deep Work session               │
│                      │
│   [ Claim daily reward ]          │  +coins
└─────────────────────┘
```
Se déclenche à 22h (configurable) ou à l'ouverture le lendemain — pas un écran qu'on navigue vers manuellement en usage normal.

---

## Comeback (CDC §43)

```
┌─────────────────────┐
│ "WELCOME BACK."         │
│ "Missing 4 days."        │
│ "Your streak is broken.   │
│  But your progress         │
│  is not."                   │
│                      │
│ Total XP: 24 500              │
│ Longest streak: 34 days        │
│ Achievements: 12                │
│ Level: 18                        │
│                      │
│   [ Begin a Comeback         │
│     Streak → ]                   │
└─────────────────────┘
```
Aucun message culpabilisant (CDC §43, explicite) — pas de "you missed 4 days!" alarmiste, pas de rouge/`blood` sur cet écran malgré l'échec de streak. Se déclenche automatiquement à la reconnexion après un streak cassé ou 3+ jours d'absence, jamais accessible autrement.

---

## Overlays transverses

Ces trois peuvent apparaître par-dessus n'importe quel écran de la boucle quotidienne — ils ne sont pas des écrans de navigation, ce sont des overlays plein écran temporaires.

### XP popup (micro, 180ms)
```
        +40 XP
```
Flotte au-dessus de l'habitude tapée, fade + léger déplacement vers le haut, disparaît. Pas de son si désactivé dans les réglages.

### Level Up (hero, 640ms)
```
┌─────────────────────┐
│                      │
│      LEVEL UP          │  ember-tinted vignette
│                      │
│       LEVEL 25          │  reveal à 640ms, mono, hero size
│                      │
│   [ PROCEED ]           │  un seul bouton, jamais de confetti
└─────────────────────┘
```

### Achievement Unlock (Rare+)
```
┌─────────────────────┐
│  [particle/glow FX      │  intensité selon rareté (CDC §45) :
│   selon rareté]           │  Common/Uncommon = statique,
│                      │  Rare = léger glow, Epic = particules,
│  🏆 "Iron Discipline"     │  Legendary/Mythic = cinématique + son
│  "30-day streak."          │
│                      │
│  [ tap to dismiss ]          │
└─────────────────────┘
```
Common/Uncommon peuvent se contenter d'un toast discret en bas d'écran plutôt qu'un plein-écran — réserver l'interruption complète aux raretés Rare+ (sinon la boucle quotidienne serait interrompue en permanence, ce qui contredirait "chaque action mérite une réaction" sans devenir fatigant).
