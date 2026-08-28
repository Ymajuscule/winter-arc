import { useAppFonts } from '@/hooks/use-app-fonts';
import { initSessionListener } from '@/stores/session-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { frost } from '@winterarc/ui-primitives';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'react-native';

SplashScreen.preventAutoHideAsync();
initSessionListener();

/** CLAUDE.md §3 — TanStack Query owns server state (quests today; more reads move here over time). */
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

/**
 * Root layout — dark-only theme lock (CLAUDE.md §12: "dark cinematic, not
 * 'dark mode'"), no system theme switch, no ThemeProvider light/dark
 * branching. Holds the native splash screen until fonts finish loading, then
 * hands off to Écran 1 (src/app/index.tsx) — a *different*, in-app splash
 * (video loop, manifesto) that the native splash screen only bridges to.
 */
export default function RootLayout() {
  const [fontsLoaded] = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar barStyle="light-content" backgroundColor={frost.void} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: frost.void },
          animation: 'fade',
        }}
      />
    </QueryClientProvider>
  );
}
