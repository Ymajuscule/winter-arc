import { STAT_FULL_LABELS, STAT_LABELS, useStats } from '@/hooks/use-stats';
import { signOutCompletely } from '@/lib/auth-flow';
import { useAppStore } from '@/stores/app-store';
import { useSessionStore } from '@/stores/session-store';
import { CLASSES, STAT_IDS, levelFromTotalXp } from '@winterarc/game-engine';
import {
  Frame,
  Hairline,
  Nameplate,
  StatBar,
  StatRadar,
  Surface,
  Text,
  XPBar,
  palettes,
  spacing,
} from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Profile — CDC §28 (stat visualisation) on top of §49-68's identity block.
 *
 * The radar and the bar list are the same seven numbers twice, deliberately:
 * §28 asks for both, and they answer different questions (shape vs. ranking).
 * The timeline and per-stat heatmap §28 also lists need day-by-day history
 * this screen doesn't fetch — left out rather than approximated.
 *
 * Cosmetic slots are shown as what's equipped, read-only. The equip flow
 * (picking from the owned catalog) is a separate open Phase 1 item; a picker
 * that silently failed to persist would be worse than not offering one.
 *
 * Also the only place to sign out. It belongs on the identity screen rather
 * than in a settings menu that doesn't exist yet, and it needs a confirm:
 * signing out clears the persisted local state (`app-store` is MMKV-backed),
 * which for a demo-mode user with no account is genuinely destructive.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const totalXp = useAppStore((s) => s.totalXp);
  const lifetimeXp = useAppStore((s) => s.lifetimeXp);
  const coins = useAppStore((s) => s.coins);
  const streak = useAppStore((s) => s.streak);
  const arc = useAppStore((s) => s.arc);
  const { data: stats } = useStats();
  const session = useSessionStore((s) => s.session);
  const isCloudSynced = useAppStore((s) => s.isCloudSynced);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    const result = await signOutCompletely();
    if (!result.ok) setSignOutError(result.message);
    // Local state is cleared either way, so the splash is the honest landing
    // spot even when the server-side revoke failed.
    router.replace('/');
  }

  const level = levelFromTotalXp(totalXp);
  const classDef = profile.classId ? CLASSES[profile.classId] : null;
  const accent = palettes[profile.paletteId].ice;

  const axes = STAT_IDS.map((id) => ({
    label: STAT_LABELS[id],
    value: stats.scores[id],
  }));

  // Highest-scoring stat, for the one line of interpretation the screen
  // offers. Ties resolve to STAT_IDS order, which is CDC §26's own.
  const strongest = STAT_IDS.reduce((best, id) =>
    stats.scores[id] > stats.scores[best] ? id : best,
  );

  return (
    <Surface variant="void" style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text variant="label" color="fog">
              ← DASHBOARD
            </Text>
          </Pressable>

          <Nameplate
            username={profile.username || 'UNNAMED'}
            level={level.level}
            title={profile.title ?? undefined}
            avatar={
              <Frame tier="iron" size={44}>
                <Text variant="title" color="bone">
                  {(profile.username || '?').charAt(0).toUpperCase()}
                </Text>
              </Frame>
            }
          />

          <View style={styles.xpBlock}>
            <Text variant="mono" color="fog">
              LVL {String(level.level).padStart(2, '0')} :: {level.xpIntoLevel} /{' '}
              {level.xpForNextLevel} XP
            </Text>
            <XPBar progress={level.xpIntoLevel / Math.max(1, level.xpForNextLevel)} />
          </View>

          <Hairline style={styles.divider} />

          <Text variant="label" color="fog">
            CHARACTER
          </Text>
          <View style={styles.radarWrap}>
            <StatRadar axes={axes} accent={accent} />
          </View>

          {stats.contributionCount === 0 ? (
            // Design Law rule 8 — one line, one hairline, no illustration.
            <Text variant="body" color="fog" style={styles.emptyLine}>
              Nothing logged yet. The character takes its shape from what you do.
            </Text>
          ) : (
            <Text variant="body" color="fog" style={styles.emptyLine}>
              Strongest: {STAT_FULL_LABELS[strongest].toLowerCase()}.
            </Text>
          )}

          <View style={styles.barList}>
            {STAT_IDS.map((id) => (
              <StatBar
                key={id}
                label={STAT_FULL_LABELS[id]}
                value={stats.scores[id]}
                accent={accent}
              />
            ))}
          </View>

          <Hairline style={styles.divider} />

          <Text variant="label" color="fog">
            RECORD
          </Text>
          <View style={styles.recordGrid}>
            <Stat label="LIFETIME XP" value={lifetimeXp.toLocaleString('en-US')} />
            <Stat label="COINS" value={String(coins)} />
            <Stat label="STREAK" value={String(streak.currentCount).padStart(2, '0')} />
            <Stat label="LONGEST" value={String(streak.longestCount).padStart(2, '0')} />
          </View>

          <Hairline style={styles.divider} />

          <Text variant="label" color="fog">
            IDENTITY
          </Text>
          <View style={styles.identityList}>
            <IdentityRow label="CLASS" value={classDef ? classDef.name.toUpperCase() : 'NONE'} />
            <IdentityRow label="PALETTE" value={profile.paletteId.toUpperCase()} />
            <IdentityRow label="TITLE" value={(profile.title ?? 'NONE').toUpperCase()} />
            <IdentityRow
              label="ARC"
              value={arc ? `${arc.name.toUpperCase()} · ${arc.status.toUpperCase()}` : 'NONE'}
            />
            <IdentityRow
              label="ACCOUNT"
              value={session?.user.email ?? (isCloudSynced ? 'SIGNED IN' : 'LOCAL ONLY')}
            />
          </View>

          <Hairline style={styles.divider} />

          {signOutError ? (
            <Text variant="body" color="blood">
              {signOutError}
            </Text>
          ) : null}
          {/*
            Two-step confirm rather than `Alert.alert`: an OS dialog is the
            one piece of chrome the app can't style, and for a demo-mode user
            this button really does destroy their only copy of the arc, so it
            has to say so in the app's own voice. Also keeps the flow
            clickable on the web dev server, where RN's Alert has no buttons.
          */}
          {confirmingSignOut ? (
            <View style={styles.confirmBlock}>
              <Text variant="body" color="ghost" style={styles.confirmCopy}>
                {isCloudSynced
                  ? 'Your progress stays on your account.'
                  : 'This device holds the only copy of this arc. Signing out erases it.'}
              </Text>
              <Pressable
                onPress={handleSignOut}
                disabled={signingOut}
                accessibilityRole="button"
                style={styles.signOut}
              >
                <Text variant="label" color="blood">
                  {signingOut ? 'SIGNING OUT…' : 'CONFIRM SIGN OUT'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setConfirmingSignOut(false)}
                accessibilityRole="button"
                style={styles.signOut}
              >
                <Text variant="label" color="fog">
                  CANCEL
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setConfirmingSignOut(true)}
              accessibilityRole="button"
              style={styles.signOut}
            >
              <Text variant="label" color="blood">
                SIGN OUT
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </Surface>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text variant="label" color="fog">
        {label}
      </Text>
      <Text variant="title" color="bone">
        {value}
      </Text>
    </View>
  );
}

function IdentityRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.identityRow}>
      <Text variant="label" color="fog">
        {label}
      </Text>
      <Text variant="mono" color="ghost">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { padding: spacing.xl, gap: spacing.lg },
  xpBlock: { gap: spacing.sm },
  divider: { marginVertical: spacing.sm },
  radarWrap: { alignItems: 'center', paddingVertical: spacing.md },
  emptyLine: { textAlign: 'center' },
  barList: { gap: spacing.sm },
  recordGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
  statCell: { width: '50%', gap: spacing.xs },
  identityList: { gap: spacing.sm },
  identityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  signOut: { alignItems: 'center', paddingVertical: spacing.md },
  confirmBlock: { gap: spacing.xs },
  confirmCopy: { textAlign: 'center' },
});
