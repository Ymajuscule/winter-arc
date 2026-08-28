import { OnboardingShell } from '@/components/onboarding-shell';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Text, border, frost, radii, spacing } from '@winterarc/ui-primitives';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/**
 * CDC §9 Écran 12 — Notifications is the real OS permission prompt
 * (mandatory to *resolve*, not to *accept*: Continue unblocks whether the
 * user grants or denies, per the wireframe). Health/HealthKit integration
 * (CDC §12) is Phase 2 (habit distance/sleep sync) — not requested here,
 * "Skip" is the only real option today rather than a fake Enable button.
 */
export default function PermissionsScreen() {
  const router = useRouter();
  const notificationsResolved = useOnboardingStore((s) => s.notificationsResolved);
  const setNotificationsResolved = useOnboardingStore((s) => s.setNotificationsResolved);
  const [requesting, setRequesting] = useState(false);

  return (
    <OnboardingShell
      eyebrow="STEP 9 OF 10 · STAY ON TRACK"
      continueDisabled={!notificationsResolved}
      onContinue={() => router.push('/onboarding/reward')}
    >
      <View style={styles.item}>
        <Text variant="title" color="bone">
          Notifications
        </Text>
        <Text variant="body" color="fog" style={styles.desc}>
          Habit reminders, streak alerts, level ups. Required for the full experience.
        </Text>
        <Pressable
          disabled={notificationsResolved || requesting}
          onPress={async () => {
            setRequesting(true);
            try {
              await Notifications.requestPermissionsAsync();
            } finally {
              setRequesting(false);
              setNotificationsResolved();
            }
          }}
          style={[styles.button, notificationsResolved && styles.buttonDone]}
        >
          <Text variant="label" color={notificationsResolved ? 'ice' : 'void'}>
            {notificationsResolved ? 'ENABLED' : 'ENABLE'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.item}>
        <Text variant="title" color="bone">
          Health (optional)
        </Text>
        <Text variant="body" color="fog" style={styles.desc}>
          Sync workouts, sleep, and steps. You can enable this later from Settings.
        </Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  item: { gap: spacing.sm, marginBottom: spacing['2xl'] },
  desc: {},
  button: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: frost.ice,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  buttonDone: {
    backgroundColor: frost.graphite,
    borderWidth: border.width,
    borderColor: frost.ice,
  },
});
