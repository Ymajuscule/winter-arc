# Cahier des charges — Application mobile « Winter Arc »

**Version :** 2.1 (amendée 2026-08-28 — voir note ci-dessous)
**Type :** Application mobile de développement personnel gamifiée
**Plateforme cible :** iOS + Android uniquement. Pas de web companion.
**Technologie mobile :** React Native + Expo
**Backend :** Supabase seul (Postgres, Auth, Storage, Edge Functions, Realtime) — pas de serveur applicatif séparé
**Base de données :** PostgreSQL (Supabase)
**Authentification :** Supabase Auth
**Paiement :** Apple IAP + Google Play Billing
**Analytics :** PostHog
**Monitoring :** Sentry
**Storage :** Supabase Storage

> **Amendement 2026-08-28 :** la v2.0 originale spécifiait un backend NestJS + Prisma séparé et un web companion en V2. Julien a tranché : pas de serveur applicatif séparé, Supabase (Postgres + Edge Functions + Realtime) est tout le backend, et pas de version web — Expo iOS/Android uniquement. Ce document reflète déjà la décision ; les sections d'architecture (Partie XV) ont été réécrites en conséquence, le reste (mécaniques de jeu, cosmétiques, économie, social...) est inchangé.
>
> Ce document est la source de vérité produit pour Winter Arc. `CLAUDE.md` en dérive un résumé opérationnel (stack, layout, design law) ; en cas de divergence, ce fichier fait foi. Voir `TODO.md` pour le découpage en tâches et `SESSION-LOG.md` pour l'historique d'implémentation.

---

## Sommaire

- **Partie I — Vision & Produit** (§1–§7)
- **Partie II — Onboarding & Configuration** (§8–§13)
- **Partie III — Dashboard & Boucle quotidienne** (§14–§16)
- **Partie IV — Système de progression : XP, Levels, Prestige** (§17–§25)
- **Partie V — Statistiques & Classes de personnage** (§26–§30)
- **Partie VI — Habitudes, Quêtes, Boss** (§31–§39)
- **Partie VII — Streaks & Gestion des échecs** (§40–§43)
- **Partie VIII — Achievements & Titres** (§44–§48)
- **Partie IX — COSMÉTIQUES & CUSTOMISATION DE PROFIL** (§49–§68) ⭐
- **Partie X — Économie du jeu : monnaies, shop, coffres** (§69–§76)
- **Partie XI — Social : Squad, Feed, Leaderboard, Challenges** (§77–§85)
- **Partie XII — Journal, Mood, Analytics** (§86–§92)
- **Partie XIII — Notifications, Widgets, Deep Links, Partage** (§93–§98)
- **Partie XIV — Saisons & Battle Pass** (§99–§103)
- **Partie XV — Architecture technique** (§104–§118)
- **Partie XVI — Monétisation & Business** (§119–§123)
- **Partie XVII — Sécurité, RGPD, Anti-triche** (§124–§128)
- **Partie XVIII — Qualité, Accessibilité, i18n** (§129–§133)
- **Partie XIX — Roadmap MVP → V3** (§134–§140)

---

# PARTIE I — VISION & PRODUIT

## §1. Concept produit

Winter Arc est une application mobile de **transformation personnelle gamifiée**. L'utilisateur définit une période de progression appelée **Arc** (par défaut 90 jours), configure des habitudes et objectifs, puis les valide au quotidien. Chaque action nourrit un système de progression complet inspiré des RPG :

- XP, niveaux, prestige
- Statistiques de personnage (Force, Discipline, Santé, Savoir, Focus, Énergie, Consistance)
- Quêtes journalières, hebdomadaires, mensuelles, boss
- Streaks, achievements, titres, bannières
- Cosmétiques débloquables (avatars, cadres, thèmes, fonds, effets)
- Battle pass saisonnier
- Squads, classements, challenges communautaires

**Le pitch produit tient en une phrase :**

> *Winter Arc transforme ta vraie vie en RPG dont tu es le héros.*

## §2. Problème à résoudre

Les apps de productivité classiques échouent parce qu'elles :

1. **Perdent leur pouvoir motivationnel** après 5-10 jours d'utilisation
2. **N'ont pas de boucle de récompense** : cocher une case ne procure aucune dopamine
3. **Punissent les rechutes** au lieu de proposer un chemin de retour
4. **Manquent d'identité** : rien ne différencie l'utilisateur A de l'utilisateur B
5. **N'exploitent pas la puissance sociale** : pas de comparaison, pas de status, pas de reconnaissance
6. **Se contentent d'afficher des données** au lieu de raconter une histoire de progression
7. **Ne créent aucune envie de revenir** : l'app est un devoir, pas un plaisir

Winter Arc résout ces problèmes en **empruntant les mécaniques des jeux vidéo qui gardent leurs joueurs pendant des années** : Fortnite, League of Legends, Destiny, Duolingo, Habitica, Genshin Impact.

## §3. Vision long terme

Trois horizons :

- **Horizon 1 (0-6 mois) : le MVP addictif.** Une app solo dans laquelle un utilisateur peut passer 90 jours en se sentant progresser chaque jour.
- **Horizon 2 (6-18 mois) : la plateforme sociale.** Squads, classements, challenges publics, battle pass saisonnier, cosmétiques rares, économie du jeu.
- **Horizon 3 (18-36 mois) : l'écosystème.** Coach IA, intégrations santé, programmes créés par des coachs, marketplace, événements en live, écosystème créateurs.

## §4. Principes directeurs

1. **Chaque action mérite une réaction.** Aucune action utilisateur ne doit être silencieuse : XP, animation, son, particules.
2. **La progression est visible partout.** Sur le dashboard, dans le profil, dans les widgets, dans les notifications.
3. **Le profil est une identité.** L'utilisateur doit vouloir le montrer.
4. **L'échec est un point de reprise, jamais une fin.** Toujours proposer un chemin de retour.
5. **Le social est un accélérateur, pas un devoir.** L'app doit rester géniale même en solo.
6. **La complexité est cachée.** L'utilisateur voit une boucle simple ; le système derrière est riche.
7. **Le temps investi dans la personnalisation est du temps où l'utilisateur ne peut pas partir.** Chaque cosmétique débloqué est une raison de rester.

## §5. Terminologie officielle

Utiliser rigoureusement ces termes dans toute l'app et la documentation.

| Terme | Signification |
|---|---|
| **Arc** | Période de transformation (par défaut 90 jours) |
| **Winter Arc** | Nom du produit + arc principal hivernal |
| **Season** | Période de contenu global (thème + battle pass) |
| **XP** | Points d'expérience |
| **Level** | Niveau du personnage |
| **Prestige** | Rang au-delà du niveau max, reset avec bonus permanents |
| **Skill Point** | Point de talent à allouer manuellement |
| **Class** | Voie de spécialisation (Warrior, Scholar, Monk, etc.) |
| **Quest** | Mission à objectif défini |
| **Daily Quest** | Mission du jour |
| **Weekly Quest** | Mission de la semaine |
| **Boss** | Objectif majeur (mensuel ou d'Arc) |
| **Streak** | Série de jours consécutifs |
| **Achievement** | Succès permanent |
| **Title** | Titre affiché sous le pseudo |
| **Banner** | Bannière d'en-tête de profil |
| **Nameplate** | Encart contenant le nom + niveau |
| **Frame** | Cadre autour de l'avatar |
| **Emblem** | Symbole d'identité visuelle |
| **Sigil** | Signe secondaire (petite marque à côté du nom) |
| **Aura** | Effet visuel entourant l'avatar |
| **Squad** | Groupe privé (2 à 20 personnes) |
| **Guild** | Grand groupe public thématique (V2) |
| **Challenge** | Défi communautaire limité dans le temps |
| **Stat** | Attribut du personnage |
| **Coach** | Système de recommandations personnalisées |
| **Coin** | Monnaie douce (gagnée par l'usage) |
| **Ember** | Monnaie premium (achat ou récompenses rares) |
| **Chest** | Coffre contenant des cosmétiques aléatoires |
| **Loadout** | Configuration complète de personnalisation du profil |

## §6. Public cible

### Cible primaire — Le "Discipline Seeker" (18-30 ans)

- Étudiant, jeune actif, freelance, développeur, créateur, sportif
- Ultra-connecté, joueur (au moins occasionnel), consommateur de contenu de développement personnel
- Cherche une identité, une routine, un sentiment de contrôle
- Est prêt à payer pour un produit qu'il aime, mais critique si le produit est plat

### Cible secondaire — Le "Progression Nerd" (25-40 ans)

- Aime les tableaux, les stats, l'auto-analyse, la data
- Vient de Notion, Todoist, Habitica, Streaks, Sunsama
- Recherche un vrai système, pas un gadget

### Cible tertiaire — La communauté (via créateurs / Squads)

- Amis qui font l'app ensemble
- Communautés Discord et Twitch qui adoptent le format
- Coachs qui utilisent l'app avec leurs clients (V2)

## §7. Positionnement marketing

**Ne pas dire :** "Une app de suivi d'habitudes."
**Dire :** "Ton hiver. Ton arc. Ton évolution."

Ton et univers :

- Ambiance sombre, cinématographique, sérieuse mais pas triste
- Références visuelles : Blade Runner 2049, Dune, Destiny, Frostpunk, Attack on Titan
- Vocabulaire : arc, quête, boss, forge, ascension, prestige, seigneur, ordre
- Anti-cringe : pas d'émojis omniprésents dans le marketing, pas de "hustle culture" agressive

---

# PARTIE II — ONBOARDING & CONFIGURATION

## §8. Objectifs de l'onboarding

L'utilisateur doit :

1. Comprendre le concept en moins de 30 secondes
2. Configurer son premier Arc en moins de 3 minutes
3. Voir son personnage se personnaliser en direct pendant qu'il répond
4. Débloquer sa première récompense visuelle **avant même d'arriver au dashboard**

Règle d'or : **L'utilisateur doit finir l'onboarding avec quelque chose de visuellement à lui.** Un avatar, une couleur, un titre de départ, une bannière.

## §9. Séquence complète

### Écran 1 — Splash / Welcome

- Vidéo courte 3-5 sec (loop) : une silhouette cinématique, particules, glow bleu glacé
- Titre : **"Build your Winter Arc."**
- Sous-titre : *"Transform your next 90 days."*
- CTA principal : **Get Started**
- CTA secondaire : **Sign In**

### Écran 2 — Manifeste

Un texte pleine page qui pose l'univers :

> *"Ta vie n'est pas un jeu.
> Mais elle en suit les règles.
> Chaque action compte.
> Chaque jour te transforme.
> Bienvenue dans ton Arc."*

Un seul bouton : **Continue**.

### Écran 3 — Création du personnage (avatar)

- Choix d'un avatar de départ (12 options gratuites)
- Chaque avatar a une brève description ("Le Guerrier", "L'Érudit", "Le Moine"…)
- Ce choix débloque un **Starter Frame** correspondant

### Écran 4 — Choix des couleurs (thème personnel)

- 6 palettes disponibles au départ :
  - Frost (bleu glacé — défaut)
  - Ember (orange-rouge)
  - Void (violet profond)
  - Forest (vert émeraude)
  - Blood (rouge sombre)
  - Solar (or)
- **Impact visible immédiat sur l'interface** pendant qu'il choisit.

### Écran 5 — Nom & Pseudo

- Prénom (privé) + Username (public, unique)
- Vérification unicité en live
- Affichage : "Bienvenue, [Username]" avec effet de révélation

### Écran 6 — Questionnaire des domaines

**Question :** *"What do you want to improve?"*

Multi-select :

- 💪 Fitness
- 🧠 Mind
- 📚 Knowledge
- 💼 Career
- 💰 Finance
- 😴 Sleep
- 🥗 Nutrition
- ⚡ Energy
- 📵 Digital Discipline
- 🧘 Mental Wellness
- 🎨 Creativity
- 🤝 Relationships

Minimum 2, maximum 6.

### Écran 7 — Objectifs par domaine

Pour chaque domaine sélectionné, une carte propose 4-6 objectifs pré-définis + option "Custom". L'utilisateur en choisit 1 à 3 par domaine.

### Écran 8 — Configuration des habitudes suggérées

L'app propose **7 à 10 habitudes** générées automatiquement selon les choix précédents. L'utilisateur peut les cocher/décocher, éditer, ou en ajouter.

### Écran 9 — Choix de la difficulté globale

- **Easy** — 60% de complétion visée, streak indulgent
- **Normal** — 75% de complétion visée
- **Hard** — 85% de complétion visée
- **Extreme** — 95% de complétion visée, un jour raté = streak brisé sec

Ce choix affecte les seuils XP et les récompenses.

### Écran 10 — Choix de la classe (Class)

Basé sur les domaines sélectionnés, l'app propose une **Class** (voir §29). L'utilisateur peut :

- Accepter la suggestion
- Choisir manuellement une autre classe
- Rester "Wanderer" (sans classe) pour choisir plus tard

### Écran 11 — Récapitulatif de l'Arc

Écran cinématique qui présente le premier Arc :

```
YOUR WINTER ARC
October 1 → December 30
90 DAYS

Focus
💪 Fitness · 🧠 Discipline · 📚 Learning

Class
⚔️ WARRIOR-SCHOLAR

Difficulty
████████░░ HARD

Habits: 8
Weekly Quests: 3
Monthly Boss: 1
```

### Écran 12 — Permissions

- Notifications (obligatoire pour l'expérience)
- Health (optionnel — proposer plus tard si refusé)
- Localisation (aucune demande)

### Écran 13 — Première récompense

Avant d'entrer dans l'app, l'utilisateur reçoit :

- **Title** : *"The Awakened"*
- **Frame** : *Iron Frame* (cadre gris métallique)
- **Achievement** : *"Day Zero"*
- Animation de déblocage complète

Il rentre alors dans le dashboard avec un profil déjà unique.

## §10. Sign-in & retour utilisateur

Méthodes :

- Email + mot de passe
- Google
- Apple (obligatoire pour App Store)
- GitHub (optionnel, pour la cible dev)

Retour d'un utilisateur inactif > 14 jours : écran de **Comeback** dédié (voir §43).

## §11. Modification post-onboarding

Toutes les décisions prises pendant l'onboarding doivent être modifiables :

- Avatar → Profil > Cosmetics
- Palette → Settings > Theme
- Classe → Profil > Class (avec un cooldown ou un coût)
- Difficulté → Réglable à la fin de chaque Arc uniquement (pas en cours d'Arc pour éviter l'exploit)
- Habitudes → à tout moment

## §12. Import depuis d'autres apps

À terme (V1.5), permettre l'import depuis :

- Habitica (JSON export)
- Streaks (CSV)
- Notion (via template)
- Apple/Google Health (pour le sport)

## §13. Mode Démo

Un utilisateur peut essayer l'app **sans compte** pendant 3 jours. Ses données sont locales. À la création du compte, migration transparente vers le cloud.

---

# PARTIE III — DASHBOARD & BOUCLE QUOTIDIENNE

## §14. Structure du dashboard

Écran principal, accessible en 1 tap depuis n'importe où. Divisé en zones verticales :

### Zone 1 — Header profil (haut)

- Avatar avec cadre + aura
- Username + Title
- Level + XP bar (avec animation subtile en boucle)
- Streak flame + nombre de jours
- Accès rapide aux notifications

### Zone 2 — Progression du jour (hero)

Grande carte immersive :

```
TODAY
78% COMPLETE
████████████████░░░░
+340 XP EARNED TODAY
🔥 STREAK MAINTAINED
```

### Zone 3 — Habitudes du jour

Liste interactive, groupée par période :

- **Morning** (avant 12h)
- **Afternoon** (12h-18h)
- **Evening** (18h+)

Chaque habitude affiche :

- Icône + couleur de catégorie
- Nom + objectif
- État (à faire / en cours / fait)
- XP à gagner (visible avant complétion)

### Zone 4 — Daily Quests

3 quêtes rotatives par jour (voir §33).

### Zone 5 — Weekly Progress

Barre de progression + jours restants.

### Zone 6 — Boss (si actif)

Carte spéciale, animation subtile, jours restants.

### Zone 7 — Squad activity (si Squad rejoint)

"Alex vient de compléter son workout" / "Thomas a atteint le level 30"

## §15. Interaction avec les habitudes

Une habitude peut être complétée de 4 façons :

1. **Tap simple** (habitudes boolean)
2. **Long press** pour incrémenter (counter)
3. **Swipe → droite** pour "fait", **← gauche** pour "skip"
4. **Ouverture de la fiche** pour saisir une valeur précise (durée, distance)

À la complétion :

- Animation de checkbox
- Popup XP flottant (+40 XP)
- Progression du stat associé (Discipline +1)
- Son court (désactivable)
- Vibration légère
- Si complétion déclenche : level up / achievement / quest → animation supplémentaire

## §16. Recap de fin de journée

À 22h (heure configurable) ou à l'ouverture de l'app le lendemain :

```
DAY RECAP — OCT 24
────────────────
✓ 8 / 10 habits
+680 XP
🔥 Streak: 19 days

Stats: Strength +5, Discipline +8

Best moment: Workout at 07:15
Missed: Meditation, Water goal

Tomorrow's focus: Deep Work session
```

Bouton : **Claim daily reward** (+coins).

---

# PARTIE IV — SYSTÈME DE PROGRESSION : XP, LEVELS, PRESTIGE

## §17. Principe général

Le système de progression est le **cœur du produit**. Il doit être :

- **Lisible** : l'utilisateur sait toujours combien il gagne et pourquoi
- **Généreux au début, exigeant ensuite** : dopamine facile puis mérite réel
- **Multi-couches** : XP + Levels + Prestige + Skill Points + Class + Cosmétiques
- **Anti-triche** : XP calculée backend uniquement (voir §127)

## §18. Sources d'XP

| Source | XP typique | Fréquence max |
|---|---|---|
| Habitude simple (boolean) | 20 XP | selon planning |
| Habitude moyenne (10-30 min) | 40 XP | selon planning |
| Habitude difficile (>30 min ou intense) | 75 XP | selon planning |
| Habitude "extreme" (workout complet, 2h deep work) | 120 XP | selon planning |
| Daily Quest | 100 XP | 3/jour |
| Weekly Quest | 500 XP | 3-5/semaine |
| Monthly Quest | 1 500 XP | 1-2/mois |
| Boss d'Arc | 3 000-5 000 XP | 1/Arc |
| Achievement | 50-2 000 XP | one-shot |
| Streak milestone (7, 14, 30, 60, 100 jours) | 200-2 000 XP | rare |
| Level up milestone (10, 25, 50, 100) | bonus + cosmétique | rare |
| Journal entry | 10 XP | 1/jour |
| Mood check-in | 5 XP | 1/jour |
| Squad contribution | variable | selon activité |
| Challenge participation | variable | selon rang |

## §19. Multiplicateurs d'XP

Pour éviter la platitude, prévoir des multiplicateurs conditionnels :

- **Streak Bonus** : +5% par tranche de 7 jours de streak (max +50%)
- **Perfect Day** : +25% si 100% des habitudes du jour sont complétées
- **Class Synergy** : +15% sur les habitudes alignées avec la classe (ex: Warrior sur workout)
- **Early Bird** : +10% si complétion avant 9h
- **Weekend Warrior** : +20% sur samedi/dimanche (contre-intuitif : récompense les week-ends actifs)
- **XP Boost** (cosmétique consommable) : +50% pendant 24h, cap 5/mois
- **Season Event** : +100% pendant les événements spéciaux (Halloween, Nouvel An, etc.)

**Cap quotidien** : 3 000 XP pour éviter le farming abusif. Au-delà, l'XP continue de compter en "Overflow" pour les quêtes mais pas pour les leveling.

## §20. Formule de calcul des niveaux

Formule progressive :

```
XPRequired(n) = round(500 × n^1.35)
```

Aperçu :

| Level | XP pour atteindre | XP cumulée |
|---|---:|---:|
| 1 | 0 | 0 |
| 2 | 500 | 500 |
| 5 | 1 810 | 4 645 |
| 10 | 4 623 | 24 375 |
| 25 | 15 400 | 199 020 |
| 50 | 39 340 | 918 200 |
| 75 | 69 210 | 2 400 000 |
| 100 | 100 000 | 4 900 000 |

Le level 100 est atteignable en 1 à 3 Arcs selon l'intensité.

**Configuration côté backend** : la formule est un paramètre. L'équipe peut ajuster la courbe sans redéploiement mobile.

## §21. Milestones de niveau (récompenses)

Chaque niveau donne quelque chose. Certains niveaux donnent BEAUCOUP.

### À chaque level up

- **+1 Skill Point** (voir §22)
- **+50 Coins**
- Animation cinématique
- Notification (locale + push si autorisé)

### Milestones spéciaux

| Level | Récompense |
|---|---|
| 5 | Frame *Bronze*, Title *"Initiate"*, +100 Coins |
| 10 | Frame *Silver*, Nameplate *"Riser"*, aura Iron |
| 15 | Palette *Ember* débloquée |
| 20 | Banner *Ascent*, Title *"Committed"* |
| 25 | Frame *Gold*, +1 slot d'habitude gratuit |
| 30 | Emblem custom débloqué, Chest légendaire |
| 40 | Aura *Frost* (animée) |
| 50 | Frame *Platinum* (animée), Title *"Ironclad"*, Battle Pass boost |
| 60 | Sigil unlock, thème d'app *Midnight* |
| 75 | Frame *Diamond* (particules), Title *"The Constant"* |
| 90 | Emblem légendaire, palette custom (color picker) |
| 100 | **PRESTIGE UNLOCKED** — Frame *Obsidian*, Title *"Ascended"*, aura *Ember* |

## §22. Skill Points & arbre de talents

Chaque niveau donne 1 Skill Point. L'utilisateur peut les allouer dans un arbre à 4 branches, correspondant aux 4 méta-attributs :

### Branche Body

- **Iron Body** : +2% XP sur toutes les habitudes fitness
- **Recovery** : Recovery Days +1/mois
- **Momentum** : Streak bonus x1.5
- **Overdrive** : Débloque un type de quête "Extreme Workout"

### Branche Mind

- **Focus Mastery** : +2% XP sur les habitudes de focus/lecture
- **Deep Insight** : Insights personnalisés hebdomadaires (voir §90)
- **Clarity** : réduit le "cooldown" des Recovery Days
- **Sage's Path** : Quêtes de lecture spéciales

### Branche Spirit

- **Zen** : Mood tracking donne +5 XP au lieu de 0
- **Anchor** : Streak protégé 1 jour/mois même en échec total
- **Inner Fire** : +1 Daily Quest slot
- **Harmony** : Bonus quand plusieurs catégories sont actives

### Branche Fortune

- **Coin Purse** : +20% Coins gagnés
- **Lucky Chest** : +5% de chance de doubler le contenu d'un coffre
- **Merchant** : -10% de prix au shop
- **Prestige Path** : accélère la voie du Prestige

**Reset** : possible 1 fois par saison, gratuit. Sinon coûteux en Coins.

## §23. Système de Prestige

Une fois le level 100 atteint, l'utilisateur peut choisir de **Prestiger** :

- Son niveau redevient 1
- Son XP totale est conservée dans un compteur "Lifetime XP"
- Il gagne un **Prestige Rank** (I, II, III, IV, V, ..., X)
- Chaque rang de Prestige donne :
  - Une couleur d'icône de niveau (bronze → argent → or → platine → diamant → obsidienne)
  - Un cadre exclusif
  - Un badge "Prestige" affiché à côté du niveau
  - Un multiplicateur XP permanent (+2% par rang, cumulable jusqu'à +20%)
  - Un choix de bonus permanent au moment du Prestige (habitude slot bonus, aura exclusive, etc.)

Le Prestige est **optionnel**. L'utilisateur peut rester à Level 100 s'il ne veut pas reset. Mais visuellement, un Prestige est reconnaissable et prestigieux.

## §24. Level cap et "Legend" status

Au Prestige X (l'équivalent de 1000 niveaux cumulés), l'utilisateur atteint le status **Legend**. Ce statut :

- Débloque le titre légendaire *"Winter Legend"*
- Affiche une couronne animée sur son avatar
- Lui donne accès aux **Legend-only cosmetics** (une gamme exclusive)
- Le fait apparaître dans un **Hall of Fame** consultable dans l'app

## §25. XP Boosts consommables

Deux types :

- **XP Elixir** (24h, +50%) — obtenus via quêtes ou shop
- **XP Feast** (1h, +100%) — obtenus rarement via coffres légendaires

Les boosts sont **empilables** (elixir + événement = +150%) mais avec un cap absolu de +200% pour éviter l'exploit.

---

# PARTIE V — STATISTIQUES & CLASSES DE PERSONNAGE

## §26. Les 7 Stats principales

Le personnage possède 7 stats visibles sur une carte hexagonale (radar chart).

| Stat | Description | Alimentée par |
|---|---|---|
| **Strength** | Puissance physique | Workout, force, sport intense |
| **Discipline** | Régularité, contrôle | Streaks, habitudes matinales, digital detox |
| **Health** | Bien-être global | Sommeil, hydratation, nutrition |
| **Knowledge** | Savoir accumulé | Lecture, cours, apprentissage |
| **Focus** | Capacité de concentration | Deep work, méditation, absence de scroll |
| **Energy** | Vitalité | Sommeil, activité, mood positif |
| **Consistency** | Fiabilité dans le temps | Streaks longs, absence d'échecs |

Chaque stat va de 0 à 100. Les stats **ne diminuent pas** en cas d'échec temporaire (frustrant), mais **stagnent**. En cas d'inactivité prolongée (>14 jours), une décroissance lente commence (max -1/jour).

## §27. Sub-stats (V1.5)

Chaque stat principale peut être détaillée :

- **Strength** → Push, Pull, Legs, Core, Cardio
- **Knowledge** → Reading, Learning, Writing, Languages
- **Focus** → Deep Work, Meditation, Anti-scroll

Ces sub-stats permettent des insights fins ("Ton Core est 40% en dessous du reste, essaie de rajouter une session par semaine").

## §28. Visualisation

- **Radar chart** sur le profil (les 7 stats)
- **Barres horizontales** dans la vue détaillée
- **Timeline** montrant l'évolution stat par stat sur 30/90 jours
- **Heatmap par stat** (jour par jour, gradient de couleur selon les gains)

## §29. Classes (Class)

Une **Class** est une identité visuelle et mécanique. Elle est choisie à l'onboarding et peut être changée (avec cooldown de 30 jours).

### Classes disponibles au MVP

| Class | Icon | Focus principal | Bonus |
|---|---|---|---|
| **Warrior** | ⚔️ | Fitness | +15% XP sur habitudes physiques |
| **Scholar** | 📖 | Knowledge | +15% XP sur lecture/apprentissage |
| **Monk** | 🧘 | Focus, Discipline | +15% XP sur méditation, deep work |
| **Ranger** | 🏹 | Health, énergie | +15% XP sur sommeil, nutrition |
| **Artisan** | 🎨 | Créativité | +15% XP sur habitudes créatives |
| **Sage** | 🔮 | Équilibré | +5% XP sur tout |
| **Wanderer** | 🌫️ | Aucun | Aucun bonus, mais liberté totale |

### Classes hybrides (V1)

Après avoir atteint le level 25 dans une classe, on peut débloquer une **hybride** :

- **Warrior-Scholar** : *"The Ironclad Mind"*
- **Monk-Ranger** : *"The Serene Path"*
- **Sage-Artisan** : *"The Visionary"*
- etc.

Chaque classe a :

- Un **cadre exclusif** débloqué automatiquement
- Un **emblem** de classe
- Une **couleur d'accent** par défaut
- Des **quêtes de classe** hebdomadaires

## §30. Class-specific quests

Chaque classe reçoit une quête spéciale hebdomadaire alignée sur son identité :

- **Warrior's Trial** : 5 séances de sport en 7 jours
- **Scholar's Codex** : Lire 3h en une semaine
- **Monk's Silence** : 5 jours de méditation + 2h de focus par jour
- **Ranger's Rest** : Dormir 7h+ pendant 6 nuits
- etc.

Récompense : +1 000 XP + cosmétique de classe rotatif.

---

# PARTIE VI — HABITUDES, QUÊTES, BOSS

## §31. Modèle d'habitude — champs complets

```
Habit {
  id: UUID
  user_id: UUID
  arc_id: UUID (nullable — habitude persistante hors arc)
  name: string (max 50)
  description: string (max 200)
  icon: string (icon id)
  color: hex
  category: enum (Fitness, Mind, Knowledge, ...)
  type: enum (boolean, numeric, duration, counter, distance)
  target_value: number (nullable)
  unit: string (nullable, ex: "L", "min", "km", "reps")
  difficulty: enum (easy, medium, hard, extreme)
  xp_value: number (calculé automatiquement selon difficulty + type)
  linked_stats: array<{stat: string, weight: number}>
  schedule: HabitSchedule
  reminder_time: time (nullable)
  is_active: boolean
  is_paused: boolean
  paused_until: date (nullable)
  created_at, updated_at
}
```

## §32. Types d'habitudes détaillés

### Boolean — "Fait / pas fait"

Exemple : "Méditation" → complétée ou non. XP : fixe.

### Numeric — Valeur cible

Exemple : "Boire 2L d'eau" → l'utilisateur saisit la quantité bue. Partiel possible : 1.5L / 2L → 75% de l'XP.

### Duration — Durée

Exemple : "Deep Work" → 120 min visées. Timer intégré possible (compte à rebours ou minuterie).

### Counter — Comptage

Exemple : "Pompes" → 100/jour. L'utilisateur incrémente en tapant.

### Distance — Distance

Exemple : "Course 5 km". Peut être synchronisé avec Apple Health / Health Connect.

### Time-based — Créneau

Exemple : "Se lever à 6h30". Vérifie l'heure de complétion.

### Photo — Preuve visuelle (V2)

Exemple : "Photo de l'assiette du midi". Prompt d'appareil photo.

## §33. Daily Quests — rotation

Chaque jour, 3 quêtes rotatives sont générées automatiquement à partir :

- Des habitudes actives de l'utilisateur
- De son historique (renforce les habitudes fragiles)
- De la classe et des stats sous-alimentées

Exemples :

- *"Complete 100% of your morning routine"* (+150 XP)
- *"Meditate 15 min today"* (+100 XP)
- *"Read for 30 min before bed"* (+120 XP)

Une **4e quête bonus** peut apparaître aléatoirement (aventure surprise, +300 XP).

## §34. Weekly Quests

3 à 5 quêtes par semaine :

- 1 quête de fréquence ("4 workouts cette semaine")
- 1 quête de volume ("100 pages lues")
- 1 quête de consistance ("Coche ≥ 80% des habitudes 5 jours d'affilée")
- 1 quête sociale (V1 — "Encourage un membre du squad")
- 1 quête de classe (voir §30)

## §35. Monthly Quests & Boss

### Monthly Quest

Objectifs plus longs : "Lire 3 livres", "Faire 20 workouts", "Aucun jour sans méditation".

### Boss

Le Boss est **l'objectif signature du mois**. Un seul actif à la fois. Exemples :

```
🐺 THE DISCIPLINE TEST
Complete 80% of your habits for 30 consecutive days.
Reward: +3 000 XP, Frame "Iron Will", Achievement.

🐉 THE DEEP WORK DRAGON
Log 60h of deep work this month.
Reward: +3 500 XP, Aura "Focus Flame".

🦉 THE SCHOLAR'S GAUNTLET
Read for 30h and take 15 pages of notes.
Reward: +3 000 XP, Emblem "Owl of Athena".
```

Le Boss est **visible en haut du dashboard** durant tout le mois, avec sa barre de progression.

## §36. Boss d'Arc (final boss)

Chaque Arc de 90 jours culmine avec un **Final Boss** :

```
❄️ THE WINTER SOVEREIGN
Complete your Winter Arc with 85%+ completion.
Reward:
  +5 000 XP
  Frame "Winter Sovereign" (animée)
  Title "Winter Soldier"
  Legendary Chest
  1 Prestige acceleration
```

Battle final : les 7 derniers jours de l'Arc sont marqués comme **"Final Push"** avec un thème visuel spécial et un multiplicateur XP.

## §37. Custom Quests (V1.5)

L'utilisateur peut créer ses propres quêtes :

- Titre
- Description
- Condition (habitude X × Y fois en Z jours)
- XP (calculé automatiquement selon difficulté estimée)
- Récompense cosmétique (au choix parmi les cosmétiques débloquables)

## §38. Chaînes de quêtes (Quest Lines)

À terme, permettre des **chaînes narratives** :

```
THE WARRIOR'S PATH
├── Step 1: 10 workouts (100 XP each)
├── Step 2: 30-day workout streak
├── Step 3: Complete a specific boss
└── Reward: Legendary frame "Champion"
```

## §39. Habitudes en pause / vacances

L'utilisateur peut mettre son Arc en **Vacation Mode** :

- Max 14 jours/an
- Streaks préservés
- Aucune quête ne compte
- Un badge "Wanderer" est visible sur le profil (assumé, pas honteux)

---

# PARTIE VII — STREAKS & GESTION DES ÉCHECS

## §40. Types de streaks

- **Habit Streak** : par habitude, jours consécutifs de complétion
- **Global Streak** : jours consécutifs où l'utilisateur a validé ≥ X% de ses habitudes (X = seuil de sa difficulté)
- **Category Streak** : par catégorie (Fitness streak, Reading streak…)
- **Perfect Streak** : jours consécutifs à 100% de complétion (rare, très valorisé)
- **Quest Streak** : semaines consécutives où toutes les weekly quests sont complétées

## §41. Milestones de streaks

Chaque streak déclenche des récompenses :

| Jours | Récompense |
|---|---|
| 3 | +50 XP, animation flame level 1 |
| 7 | +200 XP, Achievement, upgrade flame |
| 14 | +500 XP, Cosmétique streak flame (couleur bronze) |
| 30 | +1 200 XP, Frame *"Iron Will"*, flame silver |
| 60 | +2 500 XP, Aura *"Determined"*, flame gold |
| 100 | +5 000 XP, Title *"The Constant"*, flame azure |
| 200 | +10 000 XP, Frame *"Unbroken"*, flame diamond |
| 365 | +25 000 XP, LEGENDARY *"Year of Iron"*, flame animée + particules + son unique |

## §42. Gestion des échecs — philosophie

**Un jour raté ne doit jamais être une punition brutale.** Sinon l'utilisateur abandonne.

3 mécanismes de protection :

### Streak Freeze (le "gel")

- L'utilisateur peut geler sa streak 1 jour/mois (2 avec un Skill Point "Anchor").
- Le gel se déclenche automatiquement si :
  - L'utilisateur a été actif 6/7 jours précédents
  - Il n'a pas déjà utilisé son freeze du mois

### Recovery Day

- Coût : 200 Coins OU 24h de délai
- Restaure une journée ratée jusqu'à J-2
- Limité à 2/mois

### Grace Period

- En cas d'échec, l'utilisateur a **jusqu'à minuit + 3h** pour rattraper (compléter l'habitude entre 00h00 et 03h00 du lendemain)

## §43. Comeback experience

Si l'utilisateur revient après avoir cassé sa streak ou après une absence > 3 jours :

```
WELCOME BACK.
Missing 4 days.
Your streak is broken.
But your progress is not.

Here's what you accomplished:
────────────────
Total XP: 24 500
Longest streak: 34 days
Achievements: 12
Level: 18

Start a Comeback Streak.
[ Begin → ]
```

**Comeback Streak** : les 7 premiers jours après un retour offrent **+50% XP** et un cosmétique de "Phoenix" à la clé.

Aucun message culpabilisant, aucun rappel des échecs.

---

# PARTIE VIII — ACHIEVEMENTS & TITRES

## §44. Structure d'un achievement

```
Achievement {
  id
  name
  description
  icon
  rarity: Common | Uncommon | Rare | Epic | Legendary | Mythic
  category: Progression | Consistency | Social | Exploration | Prestige
  condition (JSON, évalué backend)
  xp_reward
  coins_reward
  cosmetic_reward (nullable — frame, title, aura, emblem…)
  hidden: boolean (achievements secrets)
  progress_tracking: boolean (montre la barre de progression avant unlock)
}
```

## §45. Raretés — impact visuel

| Rareté | Couleur | Effet | % joueurs attendus |
|---|---|---|---|
| Common | Gris | statique | 80%+ |
| Uncommon | Vert | statique | 50% |
| Rare | Bleu | léger glow | 20% |
| Epic | Violet | glow + particules discrètes | 5% |
| Legendary | Or | animation complète + son | <1% |
| Mythic | Rouge/blanc | animation cinématique + effet global | <0.1% |

Chaque déblocage d'un achievement légendaire déclenche :

- Une animation plein écran (2-3 sec)
- Un son distinctif
- Un feed post partageable
- Un tag "NEW" sur le profil pendant 7 jours

## §46. Exemples d'achievements par catégorie

### Progression

- **First Step** (Common) — Compléter sa première habitude
- **Rising** (Uncommon) — Atteindre Level 10
- **The Ascension** (Epic) — Atteindre Level 50
- **Beyond Limits** (Legendary) — Atteindre Prestige I

### Consistency

- **Week Warrior** (Common) — 7 jours de streak
- **Iron Discipline** (Rare) — 30 jours
- **The Constant** (Epic) — 100 jours
- **Year of Iron** (Legendary) — 365 jours

### Domaines spécifiques

- **100 Workouts** (Rare)
- **1 000 Books Pages** (Uncommon)
- **50h Deep Work** (Rare)
- **Zen Master** (Epic) — 100 sessions de méditation
- **The Hydra** (Common) — 30 jours d'objectif hydratation atteint

### Social

- **First Squad** (Common) — Rejoindre un squad
- **Squad Leader** (Uncommon) — Créer un squad
- **The Motivator** (Rare) — Envoyer 50 encouragements
- **Champion** (Legendary) — Gagner un challenge global

### Exploration

- **Curious** (Common) — Ouvrir toutes les sections de l'app
- **Trendsetter** (Rare) — Personnaliser complètement son profil
- **Collector** (Epic) — Débloquer 50 cosmétiques

### Secrets (hidden)

- **Night Owl** (Rare, hidden) — Compléter 20 habitudes après minuit
- **The Comeback** (Epic, hidden) — Revenir après 30 jours d'absence et faire une streak de 30
- **Solo Path** (Legendary, hidden) — Terminer un Arc sans jamais rejoindre un squad
- **The Silent One** (Mythic, hidden) — 90 jours sans jamais utiliser le journal ni les réactions sociales

## §47. Titres (Titles)

Un **Title** s'affiche sous le pseudo (ex : *Alex — "The Constant"*). Chaque utilisateur peut avoir plusieurs titres débloqués, mais un seul actif à la fois.

Exemples :

- *"Awakened"* (starter)
- *"Initiate"* (Level 5)
- *"Committed"* (Level 20)
- *"The Constant"* (100-day streak)
- *"Iron Willed"* (Boss d'Arc complété)
- *"Winter Soldier"* (Winter Arc terminé à 90%+)
- *"Ascended"* (Prestige I)
- *"Legend"* (Prestige X)
- *"Phoenix"* (Comeback Streak de 30 jours après reset)
- *"The Explorer"* (essayé toutes les classes)
- *"Void Walker"* (unlock secret via un événement)

Les titres légendaires ont un effet visuel (glow, couleur, particule) sur le nom.

## §48. Collection & complétion

Le profil affiche une section **Achievements Collection** :

- 4 vues : Grid, Categories, Timeline, Rarest
- % de complétion globale
- Un compteur "X / Y achievements unlocked"
- Filtres par rareté, catégorie, saison

Débloquer **100% d'une catégorie** = achievement méta ("Completionist: Fitness", etc.).

---

# PARTIE IX — COSMÉTIQUES & CUSTOMISATION DE PROFIL ⭐

Cette partie est **fondamentale**. La customisation est ce qui transforme un simple utilisateur en un joueur qui a une **identité**, un **investissement émotionnel** et une **envie de montrer son profil**.

Principe directeur : **Un utilisateur qui a personnalisé son profil ne quitte pas l'app.**

## §49. Catégories de cosmétiques

L'app propose **12 catégories** de personnalisation :

1. **Avatar** — Personnage / image de profil
2. **Frame** — Cadre autour de l'avatar
3. **Aura** — Effet visuel entourant l'avatar
4. **Banner** — Bannière d'en-tête du profil
5. **Nameplate** — Encadré contenant le pseudo et le niveau
6. **Title** — Titre affiché sous le pseudo
7. **Emblem** — Symbole d'identité (comme un blason)
8. **Sigil** — Petite marque secondaire à côté du nom
9. **Theme** — Thème de couleur de l'app entière
10. **Streak Flame** — Style visuel de la flamme de streak
11. **XP Bar Style** — Apparence de la barre d'XP
12. **Level Badge** — Style du chiffre / badge de niveau

Extensions V2 : **Sound Pack** (sons personnalisés), **Notification Style**, **Loading Screen**, **Widget Style**, **Chart Style**.

## §50. Avatar

### Modes disponibles

- **Preset avatars** (12 au départ, 30+ débloquables) — silhouettes stylisées, illustrations
- **Custom photo** (Premium) — l'utilisateur importe une image, recadrage circulaire
- **Generative avatars** (V2) — style unique généré à partir des choix et de la progression

### Slots

Un utilisateur peut avoir **jusqu'à 5 avatars sauvegardés** et en changer instantanément.

### Cadres et avatars synchronisés

Certains avatars viennent **avec** un cadre assorti (bundle "Warrior" = avatar guerrier + frame acier).

## §51. Frames (cadres)

Le cadre est **la première chose qu'on remarque**. Il doit y en avoir **beaucoup**, avec des raretés claires.

### Frames par niveau (auto-débloquées)

- Level 1 — *Iron* (gris)
- Level 5 — *Bronze*
- Level 10 — *Silver*
- Level 25 — *Gold*
- Level 50 — *Platinum* (animée, léger reflet)
- Level 75 — *Diamond* (particules)
- Level 100 — *Obsidian* (cadre noir + éclats bleu glacé)
- Prestige I+ — *Prestige Frames* évolutives

### Frames par classe (débloquées via classe)

- *Warrior's Bulwark*
- *Scholar's Sigil*
- *Monk's Circle*
- *Ranger's Wilds*
- etc.

### Frames par streak

- 30 jours — *Ember Ring* (contour orange)
- 100 jours — *Frost Halo* (contour glacé bleu)
- 365 jours — *Solar Crown* (couronne dorée animée)

### Frames par saison

Chaque saison débloque des frames exclusifs, **impossibles à obtenir hors saison** (rareté maximale à terme).

- Winter Season → *Frostborn*, *Snowfall*, *Aurora*
- Spring Season → *Bloom*, *Verdant*, *Sunrise*
- Summer Season → *Solstice*, *Wildfire*
- Autumn Season → *Harvest*, *Ember Leaf*, *Twilight*

### Frames par achievement

Certains achievements légendaires débloquent un frame unique (*"Phoenix"*, *"Void Walker"*, *"Year of Iron"*).

### Frames animées vs statiques

- Statique : niveau bas, plupart des cosmétiques accessibles
- Animée : à partir des raretés Rare+ (léger mouvement, pulsation, particules)
- **Cinématique** : Legendary et Mythic (rotation lente, éclats de lumière, effets)

## §52. Auras

Une aura est un **effet visuel qui entoure l'avatar** — halo, particules, flammes, glace. Toujours subtil (ne doit pas surcharger l'UI).

Types : Ember, Frost, Void, Verdant, Solar, Storm, Zen, Legend (réservée aux Prestige X).

**Toggle** : l'utilisateur peut désactiver son aura s'il préfère un look sobre.

## §53. Bannières (Banners)

La bannière est l'**image d'en-tête du profil**, pleine largeur, hauteur ~140px.

Styles : statiques, avec parallaxe, animées (V2 — vidéos courtes en loop, raretés hautes).

Thèmes disponibles : *Frozen Peaks*, *Neon Metropolis*, *Deep Forest*, *Desert Ascent*, *Void Space*, *Golden Path*, *Battlefield*, *Library of Ages*, *Ocean of Stars*, *Volcanic Ascent*.

Chaque saison ajoute 5-10 bannières exclusives.

## §54. Nameplates

Le nameplate est **le bloc visuel qui entoure le pseudo et le niveau**. Il définit la forme, le fond, l'encadré du niveau, les ornements.

Exemples : *Basic*, *Knight's Plate*, *Scholar's Tome*, *Void Card*, *Champion's Banner*, *Legend Mark*.

## §55. Emblems

Un **emblem** est un **symbole d'identité**, comme un blason. Environ 60 emblems disponibles : classe (7), niveau, achievement rare, saisonniers, custom (Premium — éditeur simple).

## §56. Sigils

Un **sigil** est **plus petit qu'un emblem**, affiché à côté du nom. Exemples : ❄️ (Frost), 🔥 (Ember), 👁️ (All-Seeing), 🐺 (Wolf).

## §57. Themes (thèmes de couleur de l'app)

| Thème | Ambiance | Débloqué par |
|---|---|---|
| *Frost* | Bleu glacé (défaut) | Onboarding |
| *Ember* | Orange-rouge | Level 15 |
| *Void* | Violet sombre | 30-day streak |
| *Forest* | Vert profond | Ranger class Level 10 |
| *Blood* | Rouge sombre | Achievement "Iron Discipline" |
| *Solar* | Or | Prestige I |
| *Midnight* | Noir + accents blancs | Level 60 |
| *Aurora* | Multi-couleurs animées | Battle Pass Season 1 |
| *Cyberpunk* | Néons violets/roses | Season event |
| *Origin* | Sépia doux | Achievement "Reader of Ages" |
| *Custom* (Premium) | Color picker complet | Abonnement Premium |

**Preview live** : l'utilisateur voit le changement en temps réel avant de valider.

## §58. Streak Flame

| Jours | Style de flamme |
|---|---|
| 1-6 | Petite flamme rouge simple |
| 7-13 | Flamme orange plus grosse, léger mouvement |
| 14-29 | Flamme rouge-orange avec particules |
| 30-59 | Flamme bleue (froide, intense) |
| 60-99 | Flamme violette avec halo |
| 100-199 | Flamme blanche avec noyau doré |
| 200-364 | Flamme diamant (bleu-blanc étincelant) |
| 365+ | Flamme éternelle : mix or/rouge, particules, halo animé, effet cinématique |

Personnalisation supplémentaire : skin de flamme parmi ceux débloqués (bleu, vert, arc-en-ciel, éclair, glace…).

## §59. XP Bar Style

Solid (défaut), Gradient, Segmented (Destiny-like), Neon, Particles, Runic (achievement).

## §60. Level Badge

Typographie, encadrement (cercle, hexagone, écusson, couronne), couleur (héritée du Prestige), effet (statique, glow, particules, animation d'apparition).

## §61. Loadouts (configurations de profil)

Un **loadout** = une **combinaison complète de cosmétiques**. Jusqu'à **5 loadouts** (10 en Premium), switch en un tap.

## §62. Écran "Cosmetics" — vitrine complète

Section dédiée du profil avec 12 onglets (un par catégorie), overview de complétion, et pour chaque cosmétique : preview, nom, rareté, statut, méthode de déblocage, bouton Equip/Preview.

## §63. Écran "Profile Editor"

Un éditeur **live** de profil : aperçu en haut, panneaux par cosmétique en bas, changement instantané, bouton "Randomize", bouton "Save as Loadout".

## §64. Mécanismes de déblocage — récapitulatif

9 canaux : progression de niveau, streaks, achievements, boss & quêtes, battle pass saisonnier, coffres, shop, événements limités, achievements sociaux.

## §65. Cosmétiques exclusifs (limités dans le temps)

Battle pass saisonnier, événements spéciaux, récompenses de leaderboard saisonnier, Founders' Pack. **Ne reviennent jamais.**

## §66. Cosmétiques créés par les utilisateurs (V3)

Programme créateurs, validation équipe, % sur ventes, cosmétiques signés.

## §67. Preview & partage de profil

Prévisualisation, génération d'image partageable, lien de profil public, comparaison avec un ami (V1).

## §68. Impact du profil dans le reste de l'app

Le profil customisé apparaît dans le feed du squad, les leaderboards, les cartes de challenge, le widget mobile, les partages sociaux, les notifications inter-utilisateurs. **Aucun cosmétique n'est purement décoratif.**

---

# PARTIE X — ÉCONOMIE DU JEU : MONNAIES, SHOP, COFFRES

## §69. Deux monnaies

### Coins (monnaie douce)

Gagnées gratuitement par l'usage. Cap quotidien : 1 000 Coins. Utilisation : shop, Recovery Days, boosts d'XP, cadeaux.

### Embers (monnaie premium)

Gagnées rarement ou achetables. Utilisation : cosmétiques exclusifs, coffres rares, custom color picker, Skill Point respec.

**Aucune mécanique pay-to-win.** Les Embers ne donnent JAMAIS d'XP directement.

## §70. Sources de Coins détaillées

| Action | Coins |
|---|---|
| Complétion d'habitude simple | +2 |
| Complétion d'habitude difficile | +8 |
| Perfect Day (100% des habitudes) | +50 bonus |
| Daily Quest complétée | +25 |
| Weekly Quest complétée | +100 |
| Level up | +50 (+100 tous les 5 niveaux) |
| Streak milestone (7, 14, 30...) | +100 à +2 000 |
| Boss vaincu | +500 |
| Achievement | +25 à +500 selon rareté |
| Daily login | +20 |
| Squad activity (encourager) | +5 |

## §71. Sources d'Embers

| Source | Embers |
|---|---|
| Achievement Legendary | +50 |
| Achievement Mythic | +200 |
| Prestige I à X | +100 par palier |
| Battle Pass tier premium | +10 par tier |
| Coffre légendaire (rare) | +10-50 |
| Événement spécial (top classement) | +100-1000 |
| Achat in-app | selon pack |

## §72. Shop

Rotating Weekly (7 items, reset lundi), Rotating Daily (3 items), Permanent Store (Recovery Days, extra habit slots, respec, loadout slots), Featured (Battle Pass, bundles, Founders items).

## §73. Prix indicatifs

| Item | Coût |
|---|---|
| Frame Uncommon | 500 Coins |
| Frame Rare | 1 500 Coins ou 20 Embers |
| Frame Epic | 5 000 Coins ou 50 Embers |
| Frame Legendary | 15 000 Coins ou 150 Embers |
| Banner | 800-3 000 Coins |
| Aura | 1 200-8 000 Coins |
| Recovery Day | 200 Coins |
| Extra habit slot (permanent) | 3 000 Coins |
| Skill Point respec | 500 Coins (1/saison gratuit) |
| Custom theme (color picker) | 30 Embers |

## §74. Coffres (Chests)

### Types

Wooden (daily login, 1 item Common), Iron (weekly quest, 1-3 items Common/Uncommon), Silver (boss, 3 items Uncommon/Rare), Gold (battle pass end, 4 items Rare/Epic + 1 Legendary garanti), Obsidian (extrêmement rare, 5+ items Epic/Legendary + chance Mythic).

### Cérémonie d'ouverture

Animation 3D, révélation item par item, effet spécial Legendary/Mythic, bouton "Ouvrir tout".

### Anti-doublon

Item déjà possédé → converti en **Fragments** (voir §76).

## §75. Achat in-app (packs Embers)

| Pack | Embers | Prix indicatif |
|---|---|---|
| Starter | 100 Embers | 1,99 € |
| Standard | 500 Embers +50 bonus | 8,99 € |
| Popular | 1 200 Embers +200 bonus | 19,99 € |
| Legendary | 3 000 Embers +700 bonus | 44,99 € |
| Founder | 10 000 Embers +3 000 bonus | 129,99 € |

Aucun pack ne donne d'XP ou d'avantage gameplay direct.

## §76. Système de Fragments

Common → 5, Uncommon → 15, Rare → 50, Epic → 200, Legendary → 1 000.

Fragment Forge : Uncommon (100 Fragments), Rare (500), Epic (2 000), Legendary (8 000).

---

# PARTIE XI — SOCIAL : SQUAD, FEED, LEADERBOARD, CHALLENGES

## §77. Philosophie sociale

Le social est un **accélérateur, jamais un devoir**. Excellente en solo avant tout. Pas de "friend list" réseau social classique, focus sur petits cercles de confiance (Squads), comparaisons positives, aucun contenu non modérable.

## §78. Squad — description

Groupe de 2 à 20 personnes. Créer/rejoindre (code ou lien), nom/avatar/description/bannière/emblem, chat interne simple (V1, texte seul), squad feed, squad leaderboard, squad quests, squad achievements, squad cosmetics.

## §79. Rôles dans un Squad

Leader (créateur), Officer (délégué), Member. Jusqu'à 3 Squads simultanément (5 en Premium).

## §80. Squad Quests

Objectifs collectifs ("100 workouts en squad ce mois", "5 membres à 30 jours de streak", "500 pages lues combinées"). Récompenses collectives.

## §81. Feed social

Achievements, level ups (dès level 10), streak milestones, boss vaincus, nouveaux cosmétiques (opt-in). Interactions : Encourage (1 tap), React (6 emojis), Comment (modéré, désactivable). Configurable par portée (squad/amis/global).

## §82. Leaderboards

Types : Squad, Friends, Global (pays/région/monde), Class, Season. Périodes : Daily, Weekly, Monthly, Season, All-time. Récompenses saisonnières jusqu'au Top 1 (couronne animée + Hall of Fame).

## §83. Challenges

Global Challenges (équipe, thème saisonnier), Community Challenges (squads), Class Challenges, Friend Challenges (1v1/2v2). Récompenses : participation, top X%, top 100.

## §84. Cadeaux entre utilisateurs

1 encouragement gratuit/jour, cadeau cosmétique (Embers), boost XP à un ami (24h +25%, 20 Embers).

## §85. Modération & sécurité sociale

Aucun contenu texte non modéré au MVP, report en 2 taps, blocage utilisateur, filtre pseudos, pas de DM hors squad au MVP. Guilds publiques (V2) modérées humain + IA.

---

# PARTIE XII — JOURNAL, MOOD, ANALYTICS

## §86. Journal

Une entrée/jour max : prompt du jour (rotatif), note libre, photo optionnelle, tags custom. Recherche full-text, filtre tag, vue calendrier, export PDF (Premium). +10 XP/entrée. Achievements *Chronicler* (30), *Legacy* (365).

## §87. Mood tracking

Check-in quotidien : humeur (5 niveaux), énergie (1-5), motivation (1-5), stress (1-5). +5 XP. Alimente les Insights (§90).

## §88. Analytics — vue quotidienne

Habitudes complétées, XP gagnée, Coins gagnés, stats affectées, comparaison 7 derniers jours.

## §89. Analytics — vues hebdo / mensuelle / Arc

Hebdo : XP/jour, taux complétion, streak status, meilleure/pire journée. Mensuel : heatmap, progression catégorie/stat, top/bottom 3 habitudes. Arc : rétrospective, % réussite, achievements, cosmétiques, comparaison Arcs précédents.

## §90. Insights (moteur analytique)

Performance ("consistance +18% ce mois"), corrélationnels ("dors 7h+ → +15% complétion"), alerte ("streak fragile"), prédictifs (V2, IA — "tu termineras ton Arc à 87%").

## §91. Heatmap

Type GitHub stylisé, grille jour par jour, intensité selon % complétion, vue Overall/habitude/catégorie, zoom mois/trimestre/année.

## §92. Export & data ownership

Export JSON/CSV, export journal PDF, rapport annuel Wrapped (animé, partageable).

---

# PARTIE XIII — NOTIFICATIONS, WIDGETS, DEEP LINKS, PARTAGE

## §93. Notifications — stratégie

Personnalisées, contextuelles, silencieuses par défaut le week-end, groupées (max 3/jour), toutes désactivables. Catégories : Habit Reminder, Streak Alert, Quest Progress, Level Up, Achievement Unlocked, Squad Activity, Boss Reminder, Comeback, Reward Available. Timing intelligent : jamais entre minuit et 7h sauf réveil personnalisé.

## §94. Widgets iOS / Android

Widget "Today" (petit), "Streak" (petit), "Habits" (moyen), "Level" (moyen), "Squad" (large), Lock Screen (iOS 16+).

## §95. Deep Links

```
winterarc://arc/{id}
winterarc://quest/{id}
winterarc://squad/{id}
winterarc://profile/{username}
winterarc://cosmetic/{id}
winterarc://challenge/{id}
```

## §96. Partage social

Cartes partageables générées automatiquement : Level Up Card, Streak Card, Achievement Card, Arc Recap Card, Year Wrapped Card. Formats : Instagram Stories/Post, TikTok, X, Snapchat, Discord. Bouton "Share Profile" génère une carte de personnage complète.

## §97. Referral system

Code de parrainage, filleul inscrit → +100 Embers parrain / +50 Embers + starter pack filleul. Milestones : 5 (cosmétique "Recruiter"), 20 ("Herald"), 100 (légendaire + titre).

## §98. Notifications inter-utilisateurs

Exploit remarquable → notif squad, encouragement reçu, cadeau reçu. Toujours opt-in.

---

# PARTIE XIV — SAISONS & BATTLE PASS

## §99. Concept de Saison

~3 mois : thème visuel, Battle Pass 100 tiers, cosmétiques exclusifs, quêtes de saison, événements, leaderboard de saison, narration. Rythme : Winter (déc-fév), Spring (mars-mai), Summer (juin-août), Autumn (sept-nov).

## §100. Structure narrative d'une saison

Winter "L'Ascension", Spring "Renaissance", Summer "Solstice", Autumn "Le Serment". Les cosmétiques suivent la narration.

## §101. Battle Pass — structure

100 tiers via XP de saison. Free Pass (1 récompense/2-3 tiers, Common-Rare) vs Premium Pass (9,99€ ou 800 Embers — 1 récompense/tier, Uncommon-Legendary, skin de saison exclusif, boosts, coffres exclusifs). Sur 90 jours à ~1000 XP/jour, tier 90+ atteignable. 10 derniers tiers = prestige (Mythic).

## §102. Événements saisonniers

2-3 événements/saison : Halloween ("The Long Night"), Nouvel An ("The Resolution"), anniversaire de l'app, lancement de saison (boss saisonnier).

## §103. Season End Ceremony

Recap cinématique, livraison récompenses leaderboard, preview saison suivante, "Season Trophy" affichable.

---

# PARTIE XV — ARCHITECTURE TECHNIQUE

## §104. Stack global

> **Amendée 2026-08-28.** Pas de backend applicatif séparé : Supabase (Postgres + Auth + Storage + Edge Functions + Realtime) est tout le backend. Pas de web, pas d'admin back-office séparé au MVP — Expo iOS + Android uniquement.

```
CLIENT (Expo — iOS + Android, pas de cible web)
├── React Native (Expo SDK 57)
├── TypeScript strict
├── Zustand (state)
├── TanStack Query v5 (server state + cache, au-dessus du client Supabase)
├── Expo Router (file-based)
├── Reanimated 4 (animations)
├── Skia (canvas / graphismes avancés)
├── MMKV (storage local rapide)
├── expo-notifications
├── expo-widgets
├── i18next

BACKEND (Supabase seul — pas de serveur applicatif séparé)
├── PostgreSQL 15+ (Supabase), schéma géré en SQL brut (supabase/migrations/)
├── Row Level Security — enforcement des permissions au niveau table
├── Supabase Auth (magic link + Apple/Google) — le mobile s'authentifie directement
├── Supabase Storage — avatars, bannières, photos de journal
├── Supabase Edge Functions (Deno/TypeScript) — seul point d'écriture pour tout
│   ce qui touche à l'intégrité du jeu (XP, currency, achievements, cosmétiques,
│   coffres, battle pass). Le mobile appelle une Edge Function, jamais la table
│   directement, pour ces écritures-là (RLS bloque l'écriture directe côté client
│   sur ces tables — voir supabase/migrations/20260827000000_init_core_schema.sql).
├── Supabase Realtime (Postgres changes / broadcast) — squad feed, leaderboard live
├── pg_cron + Edge Functions planifiées — rotation des quêtes, cutoff Grace Period,
│   reset quotidien (remplace ce qu'un worker BullMQ aurait fait)

INFRASTRUCTURE
├── EAS Build (mobile CI/CD, TestFlight + Play Console)
├── Sentry (errors — mobile + Edge Functions)
├── PostHog (analytics)
```

## §105. Architecture du repo (monorepo)

```
winter-arc/
├── apps/
│   └── mobile/         (Expo — React Native, iOS + Android)
├── packages/
│   ├── shared-types/    (types partagés mobile ↔ payloads Edge Functions)
│   ├── shared-utils/
│   ├── ui-primitives/
│   └── game-engine/    (règles XP, levels, achievements — partagé mobile + edge functions)
├── supabase/
│   ├── migrations/     (schéma SQL, un fichier + son rollback par changement)
│   └── functions/      (Edge Functions Deno — la seule "couche backend")
├── docs/
└── scripts/
```

Utiliser **Turborepo** pour la gestion du monorepo. Un seul app dans `apps/` : pas d'`api/`, pas d'`admin/`, pas de `web/`.

## §106. Architecture mobile — organisation

```
apps/mobile/src/
├── app/                (Expo Router / entry)
├── components/         (composants génériques)
│   ├── primitives/
│   ├── cards/
│   ├── charts/
│   └── animations/
├── features/
│   ├── auth/
│   ├── onboarding/
│   ├── dashboard/
│   ├── arc/
│   ├── habits/
│   ├── quests/
│   ├── gamification/
│   ├── cosmetics/      (LARGE section)
│   ├── profile/
│   ├── stats/
│   ├── social/
│   ├── squad/
│   ├── shop/
│   ├── chests/
│   ├── battle-pass/
│   ├── notifications/
│   ├── settings/
│   └── widgets/
├── navigation/
├── services/           (client Supabase, appels Edge Functions, storage)
├── stores/             (zustand)
├── hooks/
├── lib/                (helpers)
├── utils/
├── constants/
├── i18n/
├── theme/              (design tokens)
└── assets/
    ├── images/
    ├── animations/     (Lottie)
    ├── skia/           (fichiers Skia)
    └── sounds/
```

## §107. Architecture backend — organisation

Pas de framework serveur : la "couche backend" est un ensemble d'Edge Functions Supabase (Deno), chacune une frontière d'intégrité étroite plutôt qu'un contrôleur REST. Elles importent `packages/game-engine` pour le calcul (même logique que le mobile utilise en optimiste) et écrivent avec la clé service role, qui contourne RLS par design.

```
supabase/functions/
├── _shared/             (client Supabase admin, auth helpers, réponses JSON communes)
├── award-habit-xp/      (complétion d'habitude → xp_transactions, habit_logs, streaks)
├── claim-quest/         (validation + récompense d'une quête)
├── evaluate-achievements/ (déclenché après award-habit-xp / claim-quest / streak update)
├── advance-streak/      (avancement quotidien des streaks, freeze, comeback)
├── apply-prestige/
├── spend-skill-point/
├── open-chest/          (roll + anti-doublon → fragments)
├── shop-purchase/
├── battle-pass-claim-tier/
├── squad-quest-progress/
├── rotate-quests/        (planifiée via pg_cron — génère les daily/weekly/monthly)
├── grace-period-cutoff/  (planifiée — clôture les streaks après 00:00-03:00)
└── verify-iap-receipt/   (Apple/Google — active Premium / Battle Pass premium)
```

Chaque dossier = une Edge Function déployable indépendamment (`supabase functions deploy <name>`). Les tables sensibles (xp_transactions, user_currency, user_cosmetics, user_achievements, chests, battle_passes...) n'ont pas de policy RLS d'écriture pour le rôle `authenticated` — seules ces fonctions (rôle service) y écrivent, ce qui matérialise le principe anti-triche CDC §127 sans NestJS.

## §108. Schéma DB principal (extrait)

> Implémenté en SQL brut (`supabase/migrations/`), pas via Prisma (pas de backend NestJS pour le porter). L'extrait ci-dessous reste la référence conceptuelle du modèle — voir la migration pour le schéma réel, RLS incluse.

```prisma
model User {
  id            String @id @default(uuid())
  email         String @unique
  username      String @unique
  createdAt     DateTime @default(now())
  profile       Profile?
  arcs          Arc[]
  habits        Habit[]
  xpTransactions XPTransaction[]
  achievements  UserAchievement[]
  currencies    UserCurrency?
  cosmetics     UserCosmetic[]
  loadouts      Loadout[]
  skillPoints   Int @default(0)
  currentClassId String?
  prestigeRank  Int @default(0)
  level         Int @default(1)
  totalXP       Int @default(0)
}

model Profile {
  userId        String @id
  displayName   String
  avatarId      String?
  frameId       String?
  auraId        String?
  bannerId      String?
  nameplateId   String?
  titleId       String?
  emblemId      String?
  sigilId       String?
  themeId       String?
  flameStyleId  String?
  xpBarStyleId  String?
  levelBadgeId  String?
  isPublic      Boolean @default(true)
  bio           String?
}

model Cosmetic {
  id            String @id
  category      CosmeticCategory
  name          String
  description   String?
  rarity        Rarity
  imageUrl      String
  animatedUrl   String?
  seasonId      String?
  unlockMethod  Json // conditions
  isPurchasable Boolean
  coinPrice     Int?
  emberPrice    Int?
  isLimited     Boolean @default(false)
  availableFrom DateTime?
  availableUntil DateTime?
}

model UserCosmetic {
  userId        String
  cosmeticId    String
  unlockedAt    DateTime @default(now())
  unlockSource  String // 'level', 'achievement', 'shop', 'chest'...
  @@id([userId, cosmeticId])
}

model Loadout {
  id            String @id @default(uuid())
  userId        String
  name          String
  configuration Json // tous les IDs cosmétiques
  isActive      Boolean @default(false)
}

model XPTransaction {
  id            String @id @default(uuid())
  userId        String
  amount        Int
  source        XPSource
  sourceId      String?
  multiplier    Float @default(1.0)
  createdAt     DateTime @default(now())
}

model UserCurrency {
  userId        String @id
  coins         Int @default(0)
  embers        Int @default(0)
  fragments     Json @default("{}") // par rareté
}

model Chest {
  id            String @id @default(uuid())
  userId        String
  type          ChestType
  isOpened      Boolean @default(false)
  contents      Json?
  obtainedAt    DateTime @default(now())
  openedAt      DateTime?
}

model BattlePass {
  id            String @id
  seasonId      String
  userId        String
  isPremium     Boolean @default(false)
  currentTier   Int @default(0)
  seasonXP      Int @default(0)
  claimedTiers  Json @default("[]")
}

// (etc — tables complètes à détailler dans le doc DB dédié)
```

## §109. Game Engine (module central)

Package "game-engine" partagé (Edge Functions + calcul optimiste mobile) : `calculateXP`, `calculateLevelFromXP`, `evaluateAchievements`, `updateStreak`, `calculateStatGains`, `evaluateQuestProgress`, `applyClassBonuses`, `rollChest`. Le mobile peut faire des calculs offline optimistes, l'Edge Function qui écrit réellement en base fait foi — logique mono-source (le même package TS tourne des deux côtés, sur Deno côté fonction et sur Hermes côté mobile).

## §110. Synchronisation offline-first

1. Action enregistrée localement immédiatement (MMKV)
2. Queue de synchronisation → appel de l'Edge Function correspondante dès que le réseau est disponible
3. L'Edge Function = source de vérité (recalcule XP, achievements, etc. via `game-engine`, écrit avec la clé service role)
4. Mobile applique les corrections retournées (ajustement optimiste)
5. Cache local → TanStack Query gère l'invalidation, Supabase Realtime pousse les mises à jour venant d'autres sources (squad, événements)

## §111. Temps réel

Squad chat, squad activity feed, notifications de rangs (leaderboard), encouragements en direct : **Supabase Realtime** (Postgres changes + broadcast channels), pas de serveur WebSocket dédié. Pas critique au MVP — V1.

## §112. API — style et conventions

Pas de REST maison : le mobile parle à Supabase de deux façons — (1) lecture directe via le client Supabase + RLS pour tout ce qui est en lecture seule (catalogues, ses propres lignes), (2) `supabase.functions.invoke('<name>', { body })` pour toute écriture qui touche à l'intégrité du jeu, listée en §107. Auth : JWT Supabase (le client le gère). Rate limiting et validation des payloads vivent dans chaque Edge Function. Types partagés dans `packages/shared-types`, générés en partie via `supabase gen types typescript`.

## §113. Points d'entrée principaux (extrait)

Lecture directe (RLS) : profils, catalogues (classes, cosmetics, achievements, quest_definitions), historique personnel (arcs, habits, xp_transactions, streaks...). Écriture via Edge Function (§107) : tout ce qui accorde de l'XP, de la monnaie, un cosmétique, un achievement, un coffre, une progression de battle pass, ou vérifie un reçu d'achat.

## §114. Design system & tokens

Package **ui-primitives** : design tokens (couleurs, spacing, typo, shadows, radii), composants primitifs (Button, Card, Text, Input...), composants de gamification (XPBar, LevelBadge, StreakFlame, CosmeticPreview...), thèmes.

## §115. Animations — bibliothèques recommandées

Reanimated 3 (UI courantes), Skia (auras, particules, cadres animés), Lottie (level up, achievement unlock, coffres), React Native Fast Image.

## §116. Performance targets

Cold start < 2.5s, tap → feedback < 100ms, 60 FPS sur iPhone 12 / Pixel 6+, Edge Function p95 < 300ms, sync queue vidée < 2s sur 4G.

## §117. CI/CD

Push → Lint + Typecheck + Tests unitaires (`game-engine` en particulier) → `supabase db push` / `apply_migration` vers staging → `supabase functions deploy` → EAS Build mobile (TestFlight/Internal) → E2E (Maestro) → [Manual approval] → Deploy prod (migrations + functions) + EAS submit.

## §118. Environnements

local (Supabase CLI en local), staging (projet Supabase staging, données synthétiques), production (projet Supabase prod). Secrets Edge Functions via `supabase secrets set`, secrets mobile via EAS.

---

# PARTIE XVI — MONÉTISATION & BUSINESS

## §119. Modèle économique

Abonnement Premium (récurrent), Battle Pass premium (saisonnier), Packs Embers/cosmétiques (one-shot). Freemium généreux — le free doit être excellent.

## §120. Abonnement Premium — comparatif

**Free** : 1 Arc actif, 10 habitudes actives max, stats basiques, achievements complets, cosmétiques gagnés par gameplay, 3 loadouts, squads (rejoindre uniquement), Battle Pass free track.

**Premium** : Arcs illimités, habitudes illimitées, stats avancées (Insights, tendances, corrélations), historique complet, Battle Pass premium offert, +50 Embers/mois, import photo avatar, custom themes, 10 loadouts, créer un Squad, Custom Quests, priorité événements, Wrapped + PDF, support prioritaire.

Prix indicatifs : Mensuel 6,99 €, Annuel 49,99 €, Lifetime 149 € (offre de lancement).

## §121. Trials

7 jours gratuits (mensuel), 14 jours gratuits (annuel).

## §122. In-App Purchases

Packs Embers, Battle Pass premium, cosmétiques individuels. Apple StoreKit 2 + Google Play Billing v6+.

## §123. Business model — projections

Conversion Free → Premium 5-8%, adoption Battle Pass 15-25%, ARPU cible 12-18 €/an, LTV cible 40-60 € (3 ans).

---

# PARTIE XVII — SÉCURITÉ, RGPD, ANTI-TRICHE

## §124. Sécurité

**Auth** : JWT courts (15 min) + refresh tokens (30 jours, rotatifs), Passkeys (V1), 2FA optionnel (V1), session revocation.

**API** : rate limiting par endpoint (surtout `/habits/:id/log`), idempotency keys sur mutations, validation stricte (Zod/class-validator), CSRF (web), headers de sécurité stricts, CORS restrictif.

**Data** : TLS partout, chiffrement au repos (journal, mood), backups quotidiens (7 jours de rétention), isolation des données par tenant.

## §125. RGPD / privacy

Consentement clair au signup, politique de confidentialité en français, export des données (JSON+PDF) en 1 tap, suppression du compte (soft delete + purge à 30j), aucune vente de données, PostHog en mode privacy, journal/mood chiffrés, pas de cookies tiers.

## §126. Modération

Filtre pseudos (blacklist + IA), report en 2 taps, bannissement progressif (warning → mute → ban temporaire → ban permanent), auto-mod noms de squads.

## §127. Anti-triche

**Principe** : le mobile ne calcule jamais l'XP officielle — il envoie des events (`habit_completed`, `quest_claimed`...), le backend calcule, valide, stocke.

**Détection** : rate limits par action, cap quotidien d'XP (3 000/j max), détection de patterns suspects (jobs async), vérification heure locale vs serveur, flagging → shadow ban leaderboard.

**Sanctions** : alertes internes, shadow ban, reset XP suspect, ban définitif (dernier recours).

## §128. Audit trail

Toute action sensible (achat, prestige, gift, ban) loggée dans une table `audit_logs` immuable.

---

# PARTIE XVIII — QUALITÉ, ACCESSIBILITÉ, i18n

## §129. Tests

Unit (Game Engine > 90% coverage, utils/helpers). Integration (auth, habit creation/completion, quest evaluation, cosmetic unlock). E2E Maestro (onboarding complet, habitude → XP → level up, achievement unlock, sync offline→online). Load/stress (10k utilisateurs simultanés, leaderboards en heavy load).

## §130. Accessibilité

Dynamic Type/Font scale, contrastes WCAG AA min, VoiceOver/TalkBack complet, touch targets ≥ 44pt, option "Reduce motion", labels ARIA-équivalents, jamais d'info encodée par la seule couleur.

## §131. Internationalisation

`i18n/{fr,en,es,de,pt,it}.json`. Extraction automatique via CI check, interpolations sécurisées, pluriels ICU MessageFormat, dates localisées (date-fns + locale).

## §132. QA processus

QA manuel avant release majeure, checklists par feature, bug bash trimestriel, beta program public (TestFlight + Google Play).

## §133. Monitoring & observabilité

Sentry (errors mobile+backend), PostHog (analytics+feature flags), Datadog/Grafana (metrics infra), logs structurés JSON avec correlation IDs. Dashboards clés : DAU, MAU, retention, crash rate, API latency, conversion.

---

# PARTIE XIX — ROADMAP MVP → V3

## §134. Phase 0 — Foundation (semaines 1-4)

Setup monorepo, CI/CD, design system + tokens, auth, DB schema initial, premières Edge Functions Supabase.

## §135. Phase 1 — MVP core (semaines 5-14)

Objectif : utilisable en solo, boucle complète Arc → habitudes → XP → level → achievement.

Onboarding complet, création d'Arc, habitudes (5 types), dashboard fonctionnel, XP+Levels (jusqu'à 50), streaks+recovery, 30 achievements, stats de base, notifications, cosmétiques essentiels (12 avatars, 8 frames, 6 auras, 6 bannières, 20 titres), themes (5), loadouts (3), profile editor de base, coins, 3 daily + 3 weekly quests, 1 boss mensuel, recap fin de journée.

Livrable : beta fermée (TestFlight + Internal Testing).

## §136. Phase 2 — V1 (semaines 15-24)

Squads, squad feed+leaderboard, challenges globaux, achievements étendus (100+), cosmétiques étendus (100+), shop, coffres (Wooden/Iron/Silver), Custom Quests, journal+mood, analytics avancées, insights, widgets, partage social, referral, prestige (jusqu'à III), skill points+arbres, premium subscription, battle pass Season 1.

Livrable : lancement public.

## §137. Phase 3 — V1.5 (mois 7-9)

Événements saisonniers, cosmétiques étendus (300+), loadouts (5-10), chest system complet+fragments+forge, squad quests, guilds publiques (draft), achievements secrets, comeback experience raffinée, import Habitica/Streaks, import Apple Health/Health Connect (draft).

## §138. Phase 4 — V2 (mois 10-18)

AI Coach, intégrations santé complètes, guilds publiques, événements en live, marketplace programmes coachs, custom cosmétiques premium (color picker complet, upload). (Un companion web reste envisageable au-delà de V2 mais n'est plus planifié à ce stade — décision de Julien du 2026-08-28.)

## §139. Phase 5 — V3 (18+ mois)

Marketplace complète, créateurs/cosmétiques signature, events IRL, IA générative, localisation étendue (10+ langues), éditeur de programmes.

## §140. Métriques de succès par phase

**MVP** : 500 beta testers, DAU/MAU > 30%, D7 retention > 40%, D30 retention > 20%.
**V1** : 10k utilisateurs actifs, conversion Premium 3-5%, Battle Pass adoption 15%+, NPS > 40.
**V1.5** : 50k utilisateurs actifs, conversion Premium 5-8%, rétention D90 > 15%.
**V2** : 200k utilisateurs actifs, break-even mensuel, featured App Store/Play Store.
**V3** : 1M+ utilisateurs, ARR 5M€+, category leader "gamified habits".

---

# ANNEXES

## Annexe A — Matrice de priorisation fonctionnelle

| Feature | MVP | V1 | V1.5 | V2 | V3 |
|---|:-:|:-:|:-:|:-:|:-:|
| Auth + Onboarding | ✅ | | | | |
| Arc + Habitudes | ✅ | | | | |
| Dashboard | ✅ | | | | |
| XP / Levels | ✅ | | | | |
| Stats + Streaks | ✅ | | | | |
| Quêtes basiques | ✅ | | | | |
| Boss mensuel | ✅ | | | | |
| Achievements (30) | ✅ | | | | |
| Cosmétiques basiques | ✅ | | | | |
| Loadouts (3) | ✅ | | | | |
| Themes (5) | ✅ | | | | |
| Profile editor | ✅ | | | | |
| Notifications | ✅ | | | | |
| Coins | ✅ | | | | |
| Squads | | ✅ | | | |
| Squad feed / leaderboard | | ✅ | | | |
| Challenges globaux | | ✅ | | | |
| Shop | | ✅ | | | |
| Coffres | | ✅ | | | |
| Journal + Mood | | ✅ | | | |
| Insights | | ✅ | | | |
| Widgets | | ✅ | | | |
| Partage social | | ✅ | | | |
| Prestige | | ✅ | | | |
| Skill Points | | ✅ | | | |
| Premium sub | | ✅ | | | |
| Battle Pass | | ✅ | | | |
| Embers | | ✅ | | | |
| Événements saisonniers | | | ✅ | | |
| Custom cosmétiques | | | ✅ | | |
| Fragments / Forge | | | ✅ | | |
| Squad Quests | | | ✅ | | |
| AI Coach | | | | ✅ | |
| Apple Health / Health Connect | | | | ✅ | |
| Guilds publiques | | | | ✅ | |
| Companion web | | | | ✅ | |
| Marketplace créateurs | | | | | ✅ |
| IA générative | | | | | ✅ |

## Annexe B — Glossaire des acronymes

DAU (Daily Active Users), MAU (Monthly Active Users), WAU (Weekly Active Users), LTV (Lifetime Value), ARPU (Average Revenue Per User), MRR (Monthly Recurring Revenue), ARR (Annual Recurring Revenue), NPS (Net Promoter Score), IAP (In-App Purchase), FOMO (Fear Of Missing Out), RPG (Role-Playing Game), CI/CD (Continuous Integration / Continuous Deployment).

## Annexe C — Documents complémentaires à produire

1. Document Architecture technique (diagrammes, sécurité, scaling)
2. Schéma PostgreSQL complet (tables, index, contraintes, migrations)
3. Spécifications API endpoint par endpoint (payloads, responses, erreurs, exemples)
4. Design System complet (tokens, composants, patterns d'animation, storybook)
5. Wireframes / maquettes fonctionnelles (chaque écran, tous les états)

Chacun de ces documents doit être produit avant le début du développement.

---

**Fin du cahier des charges v2.0**
