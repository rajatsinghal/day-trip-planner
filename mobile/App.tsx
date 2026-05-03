import React, { useEffect, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';
import { AppState, type AppStateStatus } from 'react-native';
import { useStore, hydrateStore } from './src/store';
import { getInitialState } from './src/lib/linking';
import MainScreenIPad from './src/screens/MainScreenIPad';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  // If dsn is empty string, Sentry no-ops gracefully.
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  enableAutoPerformanceTracing: false,
  enableNativeFramesTracking: false,
});

// Hydration gate: app renders a null subtree until hydrateStore() completes.
// MMKV is synchronous so this resolves before the next paint in practice,
// but we still gate on it to avoid a flash-of-defaults → snap-to-persisted.
function useHydration(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydration order: deep link > MMKV > default.
    //
    // 1. Parse any initial deep link.
    // 2. Pre-seed the store from the deep link BEFORE MMKV hydration so that
    //    the deep link values win (hydrateStore's onRehydrateStorage may
    //    overwrite these, but we re-apply them after hydration).
    // 3. Call hydrateStore() to flush MMKV into the store.
    // 4. Re-apply deep link values on top of MMKV (deep link wins).

    let cancelled = false;

    void getInitialState().then((linkState) => {
      if (cancelled) return;

      // Pre-seed from deep link before hydration.
      if (linkState.hubId) {
        useStore.setState({ selectedHubId: linkState.hubId });
      }
      if (linkState.reasons) {
        useStore.setState({ selectedReasons: linkState.reasons });
      }

      // Flush MMKV → store (synchronous under the hood via skipHydration flag).
      hydrateStore();

      // Re-apply deep link on top so it wins over MMKV values.
      if (linkState.hubId) {
        useStore.setState({ selectedHubId: linkState.hubId });
      }
      if (linkState.reasons) {
        useStore.setState({ selectedReasons: linkState.reasons });
      }

      // Kick off weather fetch for the hydrated hub.
      const { selectedHubId } = useStore.getState();
      useStore.getState().setHub(selectedHubId);

      if (!cancelled) setHydrated(true);
    });

    return () => { cancelled = true; };
  }, []);

  return hydrated;
}

// Single AppState subscription for background-refresh. Lifted from the
// per-screen hooks so screen swaps (rotation, Slide Over) don't churn the
// listener and so refetch logic isn't duplicated. The MapWebView keeps its
// own internal AppState heartbeat for WebView staleness — that's separate.
function useAppStateRefresh(hydrated: boolean): void {
  useEffect(() => {
    if (!hydrated) return;
    const handle = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        useStore.getState().markBackgrounded();
        return;
      }
      if (next === 'active') {
        useStore.getState().refetchIfStale();
      }
    };
    const sub = AppState.addEventListener('change', handle);
    return () => sub.remove();
  }, [hydrated]);
}

export default function App() {
  const hydrated = useHydration();
  useAppStateRefresh(hydrated);

  if (!hydrated) {
    // Return nothing — React Native renders a blank screen while MMKV loads.
    // Because MMKV is sync this is typically sub-1ms; no splash needed here.
    return null;
  }

  // Always render MainScreenIPad. It internally falls back to MainScreenPhone
  // when shouldUseIPadLayout returns false (non-iPad devices, or iPad in Slide
  // Over < 600pt). Keeping a single root component prevents the WebView from
  // remounting on rotation / Slide Over toggle.
  return (
    <>
      <MainScreenIPad />
      <StatusBar style="auto" />
    </>
  );
}
