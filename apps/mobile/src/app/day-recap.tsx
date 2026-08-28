import { useAppStore } from '@/stores/app-store';
import { Hairline, Surface, Text, frost, spacing } from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

/**
 * CDC §16 Day Recap. "Best moment" is dropped — it needs a per-completion
 * timestamp this store doesn't track yet, and a fabricated one would be
 * exactly the kind of fake precision the Design Law's honesty implicitly
 * argues against. Everything else here is real, derived from app-store.
 */
export default function DayRecapScreen() {
  const router = useRouter();
  const habits = useAppStore((s) => s.habits);
  const xpEarnedToday = useAppStore((s) => s.xpEarnedToday);
  const streak = useAppStore((s) => s.streak);
  const dailyRewardClaimedOn = useAppStore((s) => s.dailyRewardClaimedOn);
  const claimDailyReward = useAppStore((s) => s.claimDailyReward);

  const completed = habits.filter((h) => h.completedToday);
  const missed = habits.filter((h) => !h.completedToday);
  const claimedToday = dailyRewardClaimedOn === new Date().toISOString().slice(0, 10);

  return (
    <Surface variant="void" style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <Text variant="label" color="fog">
          DAY RECAP — {todayLabel()}
        </Text>
        <Hairline style={styles.hairline} />

        <Text variant="hero" color="bone">
          {completed.length} / {habits.length}
        </Text>
        <Text variant="label" color="fog">
          HABITS
        </Text>

        <View style={styles.statRow}>
          <Text variant="mono" color="ice">
            +{xpEarnedToday} XP
          </Text>
          <Text variant="mono" color="ember">
            {streak.currentCount} day streak
          </Text>
        </View>

        {missed.length > 0 ? (
          <View style={styles.block}>
            <Text variant="label" color="fog">
              MISSED
            </Text>
            <Text variant="body" color="ghost">
              {missed.map((h) => h.name).join(', ')}
            </Text>
          </View>
        ) : (
          <View style={styles.block}>
            <Text variant="body" color="ice">
              Perfect day.
            </Text>
          </View>
        )}

        <Pressable
          onPress={() => {
            claimDailyReward();
          }}
          disabled={claimedToday}
          style={[styles.claim, claimedToday && styles.claimDisabled]}
        >
          <Text variant="label" color={claimedToday ? 'fog' : 'void'}>
            {claimedToday ? 'REWARD CLAIMED' : 'CLAIM DAILY REWARD'}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text variant="body" color="fog">
            Back to dashboard
          </Text>
        </Pressable>
      </SafeAreaView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, padding: spacing.xl, gap: spacing.sm },
  hairline: { marginVertical: spacing.sm },
  statRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  block: { marginTop: spacing.xl, gap: spacing.xs },
  claim: {
    marginTop: spacing['2xl'],
    backgroundColor: frost.ice,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 2,
  },
  claimDisabled: { backgroundColor: frost.graphite },
  backLink: { alignItems: 'center', marginTop: spacing.lg },
});
