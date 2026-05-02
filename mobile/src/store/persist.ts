// MMKV adapter for Zustand persist middleware.
// Wraps the sync MMKV API in the PersistStorage<T> interface.
// skipHydration: true so first render isn't gated on storage read.
// The useHydration() hook triggers hydration imperatively, future-proofing
// against an AsyncStorage fallback without changing call sites.

import type { PersistStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

let _mmkv: MMKV | undefined;
const getMMKV = (): MMKV => (_mmkv ??= new MMKV({ id: 'dtp.store' }));

export const mmkvStorage = <T>(): PersistStorage<T> => ({
  getItem: (name) => {
    const raw = getMMKV().getString(name);
    if (!raw) return null;
    // PersistStorage<T>.getItem must return StorageValue<T> | null,
    // where StorageValue<T> = { state: T; version?: number }.
    // JSON.parse returns that shape because Zustand persists that wrapper.
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return JSON.parse(raw) as ReturnType<PersistStorage<T>['getItem']>;
    } catch {
      // Corrupted storage — clear it and start fresh.
      getMMKV().delete(name);
      return null;
    }
  },
  setItem: (name, value) => {
    getMMKV().set(name, JSON.stringify(value));
  },
  removeItem: (name) => {
    getMMKV().delete(name);
  },
});

// Call this once after app mount (e.g. in App.tsx useEffect) to
// read persisted state into the store. Because MMKV is sync the
// hydration completes before the next React paint, so there is no
// actual flash of defaults — but the skipHydration pattern lets
// callers control the moment and is ready for an async fallback.
let _hydrated = false;
export function useHydration(hydrateStore: () => void): void {
  if (!_hydrated) {
    _hydrated = true;
    hydrateStore();
  }
}
