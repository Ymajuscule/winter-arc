import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { InterTight_700Bold } from '@expo-google-fonts/inter-tight';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';

/**
 * Loads the fonts `@winterarc/ui-primitives`' Text.tsx references by name
 * (tokens.ts's `typography.fontFamily`). Closes the Design Law violation
 * TODO.md flagged: those family names didn't resolve to anything loaded,
 * which silently falls back to the OS system font (forbidden by rule 4).
 *
 * `NeueHaasDisplay-Bold` (the CDC's actual display face) is intentionally
 * not here — it's a licensed commercial font with no available file.
 * Text.tsx's `display` variant already renders in `displayFallback`
 * (Inter Tight) instead; see that file's comment for what changes if
 * Julien provides the license.
 */
export function useAppFonts() {
  return useFonts({
    'JetBrainsMono-Regular': JetBrainsMono_400Regular,
    'JetBrainsMono-Medium': JetBrainsMono_500Medium,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'InterTight-Bold': InterTight_700Bold,
  });
}
