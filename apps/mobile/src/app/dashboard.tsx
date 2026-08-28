import { LevelUpOverlay } from '@/components/level-up-overlay';
import { type AppHabit, useAppStore } from '@/stores/app-store';
import { CLASSES, levelFromTotalXp } from '@winterarc/game-engine';
import {
  CheckIcon,
  Frame,
  Hairline,
  Nameplate,
  StreakFlame,
  Surface,
  Text,
  XPBar,
  XPOrb,
  border,
  frost,
  radii,
  spacing,
} from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PERIOD_LABEL: Record<AppHabit['period'], string> = {
  morning: 'MORNING',
  afternoon: 'AFTERNOON',
  evening: 'EVENING',
};

/**
 * CDC §14 — Dashboard. Zones 1-3 (header, today hero, habits) are real and
 * wired to app-store. Zone 4 (Daily Quests) is an honest empty state, not
 * fabricated data — rotate-quests (the assignment cron) isn't written yet
 * (TODO.md), so there is no real quest to show. Weekly Progress / Boss
 * (Zones 5-6) need history this local-only store doesn't track yet
 * (per-day completion over time, not just "today") — omitted rather than
 * faked, same reasoning.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const totalXp = useAppStore((s) => s.totalXp);
  const habits = useAppStore((s) => s.habits);
  const streak = useAppStore((s) => s.streak);
  const xpEarnedToday = useAppStore((s) => s.xpEarnedToday);
  const lastXpEvent = useAppStore((s) => s.lastXpEvent);
  const lastLevelUp = useAppStore((s) => s.lastLevelUp);
  const completeHabit = useAppStore((s) => s.completeHabit);
  const acknowledgeLevelUp = useAppStore((s) => s.acknowledgeLevelUp);

  const levelProgress = levelFromTotalXp(totalXp);
  const completedCount = habits.filter((h) => h.completedToday).length;
  const completionPct = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;
  const classDef = profile.classId ? CLASSES[profile.classId] : null;

  const byPeriod: Record<AppHabit['period'], AppHabit[]> = {
    morning: habits.filter((h) => h.period === 'morning'),
    afternoon: habits.filter((h) => h.period === 'afternoon'),
    evening: habits.filter((h) => h.period === 'evening'),
  };

  return (
    <Surface variant="void" style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Nameplate
            username={profile.username}
            level={levelProgress.level}
            title={profile.title ?? undefined}
            avatar={
              <Frame tier="iron" size={44}>
                <Text variant="title" color="bone">
                  {profile.username.charAt(0).toUpperCase()}
                </Text>
              </Frame>
            }
          />
          <View style={styles.headerMeta}>
            <XPBar
              progress={
                levelProgress.xpForNextLevel === 0
                  ? 1
                  : levelProgress.xpIntoLevel / levelProgress.xpForNextLevel
              }
              style={styles.headerXpBar}
            />
            <StreakFlame days={streak.currentCount} />
          </View>

          <Hairline style={styles.sectionDivider} />

          <View style={styles.hero}>
            <Text variant="label" color="fog">
              TODAY
            </Text>
            <Text variant="hero" color="bone">
              {completionPct}% COMPLETE
            </Text>
            <XPBar progress={completionPct / 100} height={8} />
            <Text variant="mono" color="ice" style={styles.xpToday}>
              +{xpEarnedToday} XP EARNED TODAY
            </Text>
            {classDef ? (
              <Text variant="label" color="fog">
                {classDef.icon} {classDef.name.toUpperCase()}
              </Text>
            ) : null}
          </View>

          {(['morning', 'afternoon', 'evening'] as const).map((period) =>
            byPeriod[period].length > 0 ? (
              <View key={period} style={styles.periodBlock}>
                <Text variant="label" color="fog">
                  {PERIOD_LABEL[period]}
                </Text>
                {byPeriod[period].map((h) => (
                  <Pressable
                    key={h.id}
                    onPress={() => completeHabit(h.id)}
                    disabled={h.completedToday}
                    style={styles.habitRow}
                  >
                    <View style={[styles.checkbox, h.completedToday && styles.checkboxDone]}>
                      {h.completedToday ? <CheckIcon size={12} color={frost.void} /> : null}
                    </View>
                    <Text
                      variant="body"
                      color={h.completedToday ? 'fog' : 'ghost'}
                      style={styles.habitName}
                    >
                      {h.name}
                    </Text>
                    <Text variant="mono" color="fog">
                      +{h.xpValue} XP
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null,
          )}

          <Hairline style={styles.sectionDivider} />

          <View style={styles.emptySection}>
            <Text variant="label" color="fog">
              DAILY QUESTS
            </Text>
            <Text variant="body" color="fog">
              No quests assigned yet.
            </Text>
          </View>

          <Pressable onPress={() => router.push('/day-recap')} style={styles.recapLink}>
            <Text variant="label" color="fog">
              VIEW DAY RECAP →
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <XPOrb amount={lastXpEvent.amount} trigger={lastXpEvent.trigger} />
      {lastLevelUp > 0 ? (
        <LevelUpOverlay level={lastLevelUp} onProceed={acknowledgeLevelUp} />
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { padding: spacing.xl, gap: spacing.lg },
  headerMeta: { gap: spacing.sm },
  headerXpBar: {},
  sectionDivider: { marginVertical: spacing.sm },
  hero: { gap: spacing.sm },
  xpToday: {},
  periodBlock: { gap: spacing.sm },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  habitName: { flex: 1 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radii.sm,
    borderWidth: border.width * 2,
    borderColor: border.color,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: frost.ice, borderColor: frost.ice },
  emptySection: { gap: spacing.xs },
  recapLink: { alignItems: 'center', paddingVertical: spacing.md },
});
