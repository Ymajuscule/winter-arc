import { frost } from '@winterarc/ui-primitives';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: frost.void },
        animation: 'fade',
        gestureEnabled: false, // CDC §9 Écran 10: "No back button once picked (choices are choices)" — applied to the whole sequence, not just class
      }}
    />
  );
}
