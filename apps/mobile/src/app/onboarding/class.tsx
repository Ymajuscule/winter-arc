import { OnboardingShell } from '@/components/onboarding-shell';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { CLASSES, type ClassId } from '@winterarc/game-engine';
import { Text, border, frost, radii, spacing } from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/** Onboarding-only heuristic (not game math — game-engine's CLASSES is the source of truth for bonuses). */
const DOMAIN_TO_CLASS: Record<string, ClassId> = {
  fitness: 'warrior',
  knowledge: 'scholar',
  mind: 'monk',
  mental: 'monk',
  sleep: 'ranger',
  energy: 'ranger',
  nutrition: 'ranger',
  creativity: 'artisan',
};

function suggestClass(domainIds: string[]): ClassId {
  const counts: Partial<Record<ClassId, number>> = {};
  for (const id of domainIds) {
    const classId = DOMAIN_TO_CLASS[id];
    if (classId) counts[classId] = (counts[classId] ?? 0) + 1;
  }
  const best = (Object.entries(counts) as [ClassId, number][]).sort((a, b) => b[1] - a[1])[0];
  return best?.[0] ?? 'sage';
}

const ALL_CLASS_IDS = Object.keys(CLASSES) as ClassId[];

/** CDC §9 Écran 10 — suggested class from domains, accept / choose another / stay Wanderer. */
export default function ClassScreen() {
  const router = useRouter();
  const domainIds = useOnboardingStore((s) => s.domainIds);
  const classId = useOnboardingStore((s) => s.classId);
  const setClass = useOnboardingStore((s) => s.setClass);
  const suggested = useMemo(() => suggestClass(domainIds), [domainIds]);
  const [showAll, setShowAll] = useState(false);

  const active = classId ?? suggested;
  const def = CLASSES[active];

  return (
    <OnboardingShell
      eyebrow={showAll ? 'CHOOSE A CLASS' : 'STEP 8 OF 10 · SUGGESTED CLASS'}
      onContinue={() => {
        setClass(active);
        router.push('/onboarding/recap');
      }}
      secondaryLabel={showAll ? undefined : 'Choose another'}
      onSecondary={showAll ? undefined : () => setShowAll(true)}
    >
      {showAll ? (
        <View style={styles.list}>
          {ALL_CLASS_IDS.map((id) => {
            const c = CLASSES[id];
            const selected = id === active;
            return (
              <Pressable
                key={id}
                onPress={() => setClass(id)}
                style={[styles.classRow, selected && styles.classRowSelected]}
              >
                <Text variant="body" color={selected ? 'bone' : 'ghost'}>
                  {c.icon} {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.suggestion}>
          <Text variant="display" color="bone" style={styles.icon}>
            {def.icon}
          </Text>
          <Text variant="title" color="bone">
            {def.name.toUpperCase()}
          </Text>
          {def.synergyBonusPct > 0 ? (
            <Text variant="body" color="ice">
              +{Math.round(def.synergyBonusPct * 100)}% XP on{' '}
              {def.appliesToAllCategories ? 'everything' : def.focusCategories.join(', ')}
            </Text>
          ) : (
            <Text variant="body" color="fog">
              No bonus — total freedom.
            </Text>
          )}
        </View>
      )}
      <Pressable
        onPress={() => {
          setClass('wanderer');
          router.push('/onboarding/recap');
        }}
        style={styles.wandererLink}
      >
        <Text variant="body" color="fog">
          Stay Wanderer
        </Text>
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  suggestion: { alignItems: 'center', gap: spacing.sm },
  icon: { fontSize: 48 },
  list: { gap: spacing.sm },
  classRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: frost.graphite,
  },
  classRowSelected: { borderColor: frost.ice },
  wandererLink: { alignItems: 'center', marginTop: spacing.xl },
});
