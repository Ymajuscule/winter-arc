import { Surface, Text, frost, spacing } from '@winterarc/ui-primitives';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * CDC §10 / CLAUDE.md §3 — "void background, mono WINTER ARC wordmark,
 * single input, single button. No signup/login toggle — one field figures
 * it out." Magic link only for now (email + Supabase Auth `signInWithOtp`,
 * CDC §10) — Apple/Google/GitHub buttons need their own OAuth setup once
 * Supabase is linked, not added as dead buttons here.
 *
 * Not wired to Supabase yet (no project linked this session) — pressing
 * Send does nothing but show the sent state. `src/services/supabase.ts`
 * is where the real `signInWithOtp` call goes once there's a project URL.
 */
export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <Surface variant="void" style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <Text variant="mono" color="ice" style={styles.wordmark}>
          WINTER ARC
        </Text>

        {sent ? (
          <Text variant="body" color="ghost" style={styles.sentMessage}>
            Check {email} for your link.
          </Text>
        ) : (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={frost.fog}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Pressable
              onPress={() => email.includes('@') && setSent(true)}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            >
              <Text variant="label" color="void">
                SEND LINK
              </Text>
            </Pressable>
          </>
        )}
      </SafeAreaView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
  wordmark: { textAlign: 'center', marginBottom: spacing['2xl'], letterSpacing: 4 },
  input: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: frost.bone,
    borderBottomWidth: 1,
    borderBottomColor: frost.graphite,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  button: {
    backgroundColor: frost.ice,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 2,
  },
  buttonPressed: { backgroundColor: frost.glacier },
  sentMessage: { textAlign: 'center' },
});
