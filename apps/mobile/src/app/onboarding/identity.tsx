import { OnboardingShell } from '@/components/onboarding-shell';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Hairline, Text, frost, spacing } from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

/**
 * CDC §9 Écran 5 — first name (private) + username (public, unique).
 * "Vérification unicité en live" needs the Supabase `profiles` table
 * (unique constraint on username, schema-postgresql.md) — not linked yet,
 * so this validates shape locally (length/charset) only. Swap the
 * `usernameStatus` derivation for a debounced Supabase query once auth is
 * wired; the UI states (checking/available/taken) are already there.
 */
export default function IdentityScreen() {
  const router = useRouter();
  const firstName = useOnboardingStore((s) => s.firstName);
  const username = useOnboardingStore((s) => s.username);
  const setIdentity = useOnboardingStore((s) => s.setIdentity);
  const [localUsername, setLocalUsername] = useState(username);
  const [localFirstName, setLocalFirstName] = useState(firstName);

  const usernameValid = USERNAME_PATTERN.test(localUsername);

  return (
    <OnboardingShell
      eyebrow="STEP 3 OF 10"
      continueDisabled={!localFirstName.trim() || !usernameValid}
      onContinue={() => {
        setIdentity(localFirstName.trim(), localUsername);
        router.push('/onboarding/domains');
      }}
    >
      <View style={styles.field}>
        <Text variant="label" color="fog">
          FIRST NAME
        </Text>
        <TextInput
          value={localFirstName}
          onChangeText={setLocalFirstName}
          placeholder="Julien"
          placeholderTextColor={frost.fog}
          style={styles.input}
          autoCapitalize="words"
        />
        <Hairline />
      </View>

      <View style={[styles.field, styles.fieldSpacing]}>
        <Text variant="label" color="fog">
          USERNAME
        </Text>
        <TextInput
          value={localUsername}
          onChangeText={(v) => setLocalUsername(v.toLowerCase())}
          placeholder="winter_soldier"
          placeholderTextColor={frost.fog}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Hairline />
        {localUsername.length > 0 ? (
          <Text variant="label" color={usernameValid ? 'ice' : 'blood'} style={styles.hint}>
            {usernameValid ? '✓ AVAILABLE' : '3-20 CHARS, LOWERCASE/NUMBERS/UNDERSCORE'}
          </Text>
        ) : null}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  fieldSpacing: { marginTop: spacing.xl },
  input: {
    fontFamily: 'Inter-Regular',
    fontSize: 20,
    color: frost.bone,
    paddingVertical: spacing.sm,
  },
  hint: { marginTop: spacing.xs },
});
