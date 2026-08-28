import { LevelUpOverlay } from '@/components/level-up-overlay';
import { type QuestInstance, useClaimQuest, useDailyQuests, useWeeklyQuests } from '@/hooks/use-quests';
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

/** 1-indexed day-of-arc and total length, from ISO date strings (yyyy-mm-dd). */
function arcDayProgress(startsOn: string, endsOn: string): { day: number; total: number } {
  const start = new Date(`${startsOn}T00:00:00Z`);
  const end = new Date(`${endsOn}T00:00:00Z`);
  const today = new Date(`${todayIso()}T00:00:00Z`);
  const day = Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1;
  const total = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return { day: Math.min(Math.max(day, 1), total), total };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function QuestRow({
  quest,
  onClaim,
  claiming,
}: {
  quest: QuestInstance;
  onClaim: () => void;
  claiming: boolean;
}) {
  // Tapping always attempts a claim, even below 100% displayed progress: the
  // server recomputes from real habit_logs on every call (claim-quest),
  // which is also the only thing that refreshes `progress` today — there's
  // no separate "just refresh" endpoint (see use-quests.ts's file header).
  // A short-of-100 attempt comes back 409 and just updates what's shown.
  const attemptable = quest.status !== 'claimed';

  return (
    <View style={styles.questRow}>
      <View style={styles.questInfo}>
        <Text variant="body" color={quest.status === 'claimed' ? 'fog' : 'ghost'}>
          {quest.name}
        </Text>
        <Text variant="mono" color="fog" style={styles.questProgress}>
          {quest.status === 'claimed' ? 'CLAIMED' : `${Math.round(quest.progress)}%`} · +
          {quest.xpReward} XP
        </Text>
      </View>
      {attemptable ? (
        <Pressable onPress={onClaim} disabled={claiming} style={styles.claimButton}>
          <Text variant="label" color="void">
            {claiming ? '…' : quest.progress >= 100 ? 'CLAIM' : 'CHECK'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * CDC §14 — Dashboard. Zones 1-3 (header, today hero, habits) are real and
 * wired to app-store. Zone 4 (Daily Quests) and a weekly-quests block (not a
 * literal CDC Zone, folded into the same area) read real `user_quests` rows
 * via TanStack Query (`hooks/use-quests.ts`) once `rotate-quests` (the
 * assignment cron, written 2026-08-28) has run for a user — still an honest
 * empty state ("No quests assigned yet.") when demo-mode/not cloud-synced,
 * since quests only exist server-side. Zone 5's literal "weekly progress bar
 * + days remaining" and Zone 6 (Boss) still need history this local-only
 * store doesn't track (per-day completion over time) — omitted rather than
 * faked, same reasoning as before.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const arc = useAppStore((s) => s.arc);
  const isCloudSynced = useAppStore((s) => s.isCloudSynced);
  const totalXp = useAppStore((s) => s.totalXp);
  const habits = useAppStore((s) => s.habits);
  const streak = useAppStore((s) => s.streak);
  const xpEarnedToday = useAppStore((s) => s.xpEarnedToday);
  const lastXpEvent = useAppStore((s) => s.lastXpEvent);
  const lastLevelUp = useAppStore((s) => s.lastLevelUp);
  const completeHabit = useAppStore((s) => s.completeHabit);
  const acknowledgeLevelUp = useAppStore((s) => s.acknowledgeLevelUp);
  const { data: dailyQuests } = useDailyQuests();
  const { data: weeklyQuests } = useWeeklyQuests();
  const claimQuest = useClaimQuest();

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
            <View style={styles.heroLabelRow}>
              <Text variant="label" color="fog">
                TODAY
              </Text>
              {arc ? (
                <Text variant="mono" color="fog">
                  {arc.name.toUpperCase()} · DAY {arcDayProgress(arc.startsOn, arc.endsOn).day} /{' '}
                  {arcDayProgress(arc.startsOn, arc.endsOn).total}
                </Text>
              ) : null}
            </View>
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
            {isCloudSynced && dailyQuests && dailyQuests.length > 0 ? (
              dailyQuests.map((q) => (
                <QuestRow
                  key={q.id}
                  quest={q}
                  onClaim={() => claimQuest.mutate(q.id)}
                  claiming={claimQuest.isPending && claimQuest.variables === q.id}
                />
              ))
            ) : (
              <Text variant="body" color="fog">
                No quests assigned yet.
              </Text>
            )}
          </View>

          {isCloudSynced && weeklyQuests && weeklyQuests.length > 0 ? (
            <View style={styles.emptySection}>
              <Text variant="label" color="fog">
                WEEKLY QUESTS
              </Text>
              {weeklyQuests.map((q) => (
                <QuestRow
                  key={q.id}
                  quest={q}
                  onClaim={() => claimQuest.mutate(q.id)}
                  claiming={claimQuest.isPending && claimQuest.variables === q.id}
                />
              ))}
            </View>
          ) : null}

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
  heroLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
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
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  questInfo: { flex: 1, gap: 2 },
  questProgress: {},
  claimButton: {
    backgroundColor: frost.ice,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  recapLink: { alignItems: 'center', paddingVertical: spacing.md },
});
