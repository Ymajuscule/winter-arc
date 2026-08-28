import { Surface, Text, frost, motion, spacing } from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const LINES = [
  "Ta vie n'est pas un jeu.",
  'Mais elle en suit les règles.',
  'Chaque action compte.',
  'Chaque jour te transforme.',
  'Bienvenue dans ton Arc.',
];

/** CDC §9 Écran 2 — full-page manifesto, one line revealed at a time. */
export default function ManifestoScreen() {
  const router = useRouter();
  return (
    <Surface variant="void" style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={styles.text}>
          {LINES.map((line, i) => (
            <Animated.View
              key={line}
              entering={FadeIn.delay(i * motion.duration.panel).duration(motion.duration.panel)}
            >
              <Text variant="title" color="ghost" style={styles.line}>
                {line}
              </Text>
            </Animated.View>
          ))}
        </Animated.View>
        <Pressable
          onPress={() => router.push('/onboarding/avatar')}
          style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
        >
          <Text variant="label" color="void">
            CONTINUE
          </Text>
        </Pressable>
      </SafeAreaView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'space-between', paddingHorizontal: spacing.xl },
  text: { flex: 1, justifyContent: 'center', gap: spacing.sm },
  line: { textAlign: 'center' },
  primary: {
    backgroundColor: frost.ice,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 2,
    marginBottom: spacing.xl,
  },
  primaryPressed: { backgroundColor: frost.glacier },
});
