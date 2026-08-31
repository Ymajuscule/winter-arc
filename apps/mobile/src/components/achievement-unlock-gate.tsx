import { useAchievementDetails } from '@/hooks/use-achievement-details';
import { useAppStore } from '@/stores/app-store';
import { Hairline, Surface, Text, frost, motion, radii, spacing } from '@winterarc/ui-primitives';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, ZoomIn } from 'react-native-reanimated';

/**
 * wireframes.md "Overlays transverses — Achievement Unlock": Common/Uncommon
 * get a discrete bottom toast (auto-dismiss); Rare+ get a full-screen overlay
 * (tap to dismiss) so the daily loop isn't interrupted by every achievement.
 * The wireframe's rarity-scaled particle/glow FX (Epic = particles,
 * Legendary/Mythic = cinematic + sound) aren't built — that's Skia/sound
 * work already deferred elsewhere (Frame/Aura are flat-color placeholders
 * too, per TODO.md). This uses a flat accent color instead: `ice` for
 * Rare/Epic, `aurora` (CLAUDE.md's own "prestige / legendary" token) for
 * Legendary/Mythic — no new colors invented (Design Law rule 9).
 *
 * Drains app-store's `pendingAchievementIds` FIFO one at a time. Mounted
 * once in dashboard.tsx, next to LevelUpOverlay (same "local overlay owned
 * by the screen where unlocks actually happen" pattern).
 */
export function AchievementUnlockGate() {
  const pendingIds = useAppStore((s) => s.pendingAchievementIds);
  const dismiss = useAppStore((s) => s.dismissAchievement);
  const currentId = pendingIds[0] ?? null;
  const { data: achievement } = useAchievementDetails(currentId);

  if (!currentId || !achievement) return null;

  const isFullScreen = achievement.rarity !== 'common' && achievement.rarity !== 'uncommon';
  const accent =
    achievement.rarity === 'legendary' || achievement.rarity === 'mythic'
      ? frost.aurora
      : frost.ice;

  if (isFullScreen) {
    return (
      <Animated.View
        entering={FadeIn.duration(motion.duration.panel)}
        exiting={FadeOut.duration(motion.duration.panel)}
        style={styles.backdrop}
      >
        <View style={[styles.vignette, { backgroundColor: accent }]} />
        <Animated.View
          entering={ZoomIn.duration(motion.duration.hero).easing((t) => 1 - (1 - t) ** 3)}
          style={styles.content}
        >
          <Text variant="label" color="fog">
            ACHIEVEMENT UNLOCKED · {achievement.rarity.toUpperCase()}
          </Text>
          <Text variant="hero" color="bone" style={styles.centered}>
            {achievement.name.toUpperCase()}
          </Text>
          {achievement.description ? (
            <Text variant="body" color="ghost" style={styles.centered}>
              {achievement.description}
            </Text>
          ) : null}
          <Pressable
            onPress={dismiss}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text variant="label" color="void">
              CONTINUE
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={SlideInDown.duration(motion.duration.panel)}
      exiting={FadeOut.duration(motion.duration.micro)}
      style={styles.toastWrap}
      pointerEvents="box-none"
    >
      <Pressable onPress={dismiss}>
        <Surface variant="graphite" style={styles.toast}>
          <Hairline style={[styles.toastAccent, { backgroundColor: accent }]} />
          <Text variant="label" color="fog">
            ACHIEVEMENT UNLOCKED
          </Text>
          <Text variant="body" color="bone">
            {achievement.name}
          </Text>
        </Surface>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,7,10,0.92)',
  },
  vignette: { ...StyleSheet.absoluteFill, opacity: 0.06 },
  content: { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  centered: { textAlign: 'center' },
  button: {
    backgroundColor: frost.ice,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 2,
    marginTop: spacing.md,
  },
  buttonPressed: { backgroundColor: frost.glacier },
  toastWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
  },
  toast: { padding: spacing.md, borderRadius: radii.sm, gap: 2 },
  toastAccent: { marginBottom: spacing.xs },
});
