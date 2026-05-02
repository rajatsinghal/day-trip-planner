// Zustand store for the DayTrip mobile app.
// State shape mirrors web App.tsx exactly; see MOBILE_PLAN.md §6 Phase 2.
// Persisted slice: selectedHubId, windowHours, tempUnit, selectedReasons.
// Ephemeral: everything else (reset on launch or hub switch).

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  HUBS_BY_ID,
  defaultHub,
  computeDayOptions,
  type ReasonsToVisit,
  type Hub,
} from '@dtp/core';
import { VALID_REASONS } from '../lib/linking';
import type { DayOption, WeatherResponse } from '@dtp/core';
import { mmkvStorage } from './persist';

// ── types ─────────────────────────────────────────────────────────────────

export interface DTPState {
  // persisted
  selectedHubId: string;
  windowHours: [number, number];
  tempUnit: 'F' | 'C';
  selectedReasons: ReasonsToVisit[];

  // ephemeral
  selectedDay: string; // isoDate string of the selected DayOption
  weatherByDest: Record<string, WeatherResponse>;
  loading: boolean;
  failedIds: Set<string>;
  retrying: boolean;
  detailId: string | null;
  selectedId: string | null;

  // race protection — bumps on every hub switch
  fetchEpoch: number;

  // internal: current abort controller (not serialized)
  _abortController: AbortController | null;

  // ── actions ───────────────────────────────────────────────────────────

  /** Switch hub: bumps fetchEpoch, clears weather + failures, triggers fetch. */
  setHub: (hubId: string) => void;

  /** Select a day by isoDate string. */
  setDay: (isoDate: string) => void;

  /** Update the [startHour, endHour] display window. */
  setWindow: (window: [number, number]) => void;

  /** Toggle °F / °C. */
  setTempUnit: (unit: 'F' | 'C') => void;

  /** Toggle a single reason filter on/off. */
  toggleReason: (reason: ReasonsToVisit) => void;

  /** Bulk-replace the active reason filters. */
  setReasons: (reasons: ReasonsToVisit[]) => void;

  /**
   * Store weather for one destination.
   * REJECTS the write if epoch !== state.fetchEpoch (race protection):
   * a result from a previous hub switch must never overwrite current data.
   */
  setWeatherForDest: (id: string, result: WeatherResponse, epoch: number) => void;

  setLoading: (loading: boolean) => void;

  /** Mark a destination fetch as permanently failed (for this epoch). */
  markFailed: (id: string, epoch?: number) => void;

  /**
   * Re-fetch only the destinations currently in failedIds.
   * Calls the fetchWeather worker internally.
   */
  retryFailed: () => Promise<void>;

  setDetailId: (id: string | null) => void;
  setSelectedId: (id: string | null) => void;

  /**
   * Auto-close the detail sheet if the destination is no longer in
   * the filtered set. Call this whenever filteredRows changes.
   */
  clearDetailIfFiltered: (filteredIds: Set<string>) => void;
}

// ── helpers ───────────────────────────────────────────────────────────────

const DEFAULT_WINDOW: [number, number] = [10, 16];

function defaultSelectedDay(): string {
  const options = computeDayOptions();
  const defaultIdx = new Date().getHours() >= 20 && options.length > 1 ? 1 : 0;
  return options[defaultIdx].isoDate;
}

function resolveHub(id: string): Hub {
  return HUBS_BY_ID.get(id) ?? defaultHub;
}

// ── store ─────────────────────────────────────────────────────────────────

export const useStore = create<DTPState>()(
  persist(
    (set, get) => ({
      // ── initial state ──────────────────────────────────────────────────

      // persisted (defaults — MMKV overwrites on hydration)
      selectedHubId: defaultHub.id,
      windowHours: DEFAULT_WINDOW,
      tempUnit: 'F',
      selectedReasons: [],

      // ephemeral
      selectedDay: defaultSelectedDay(),
      weatherByDest: {},
      loading: false,
      failedIds: new Set<string>(),
      retrying: false,
      detailId: null,
      selectedId: null,
      fetchEpoch: 0,
      _abortController: null,

      // ── actions ────────────────────────────────────────────────────────

      setHub: (hubId: string) => {
        const state = get();

        // Cancel any in-flight fetches from the previous hub.
        state._abortController?.abort();
        const controller = new AbortController();

        const newEpoch = state.fetchEpoch + 1;

        set({
          selectedHubId: hubId,
          fetchEpoch: newEpoch,
          weatherByDest: {},
          failedIds: new Set<string>(),
          selectedId: null,
          loading: true,
          _abortController: controller,
        });

        // Kick off fetch for the new hub asynchronously.
        // Import is deferred to avoid a circular dependency at module load.
        void import('./fetchWeather').then(({ fetchWeather }) => {
          const hub = resolveHub(hubId);
          void fetchWeather(hub, newEpoch, controller.signal);
        });
      },

      setDay: (isoDate: string) => set({ selectedDay: isoDate }),

      setWindow: (window: [number, number]) => set({ windowHours: window }),

      setTempUnit: (unit: 'F' | 'C') => set({ tempUnit: unit }),

      toggleReason: (reason: ReasonsToVisit) => {
        const { selectedReasons } = get();
        const next = selectedReasons.includes(reason)
          ? selectedReasons.filter((r) => r !== reason)
          : [...selectedReasons, reason];
        set({ selectedReasons: next });
      },

      setReasons: (reasons: ReasonsToVisit[]) => set({ selectedReasons: reasons }),

      setWeatherForDest: (id: string, result: WeatherResponse, epoch: number) => {
        // Race protection: epoch check is INSIDE set() callback so it's atomic.
        set((state) => {
          if (epoch !== state.fetchEpoch) return state; // stale — no-op
          return { ...state, weatherByDest: { ...state.weatherByDest, [id]: result } };
        });
      },

      setLoading: (loading: boolean) => set({ loading }),

      markFailed: (id: string, epoch?: number) => {
        // Race protection: if caller supplied epoch, drop on stale.
        // Same atomic-inside-set pattern as setWeatherForDest.
        set((state) => {
          if (epoch !== undefined && epoch !== state.fetchEpoch) return state;
          const next = new Set(state.failedIds);
          next.add(id);
          return { failedIds: next };
        });
      },

      retryFailed: async () => {
        const state = get();
        if (state.retrying || state.failedIds.size === 0) return;

        // Abort any in-flight fetch (including a prior retry) before starting.
        state._abortController?.abort();
        const controller = new AbortController();

        const hub = resolveHub(state.selectedHubId);
        const epochAtRetry = state.fetchEpoch;
        const failedDests = hub.destinations.filter((d) => state.failedIds.has(d.id));

        set((s) => ({ ...s, _abortController: controller, retrying: true }));

        const queue = [...failedDests];
        const CONCURRENCY = 8;
        const workerCount = Math.min(CONCURRENCY, queue.length);
        const workers: Promise<void>[] = [];

        for (let i = 0; i < workerCount; i++) {
          workers.push(
            (async () => {
              const { fetchNwsForDest } = await import('../lib/nws');
              while (queue.length > 0 && !controller.signal.aborted) {
                const dest = queue.shift();
                if (!dest) break;
                try {
                  const wx = await fetchNwsForDest(dest, controller.signal);
                  // Epoch check is inside set() callback — atomic.
                  set((s) => {
                    if (epochAtRetry !== s.fetchEpoch) return s; // stale — no-op
                    const next = new Set(s.failedIds);
                    next.delete(dest.id);
                    return {
                      ...s,
                      weatherByDest: { ...s.weatherByDest, [dest.id]: wx },
                      failedIds: next,
                    };
                  });
                } catch (e) {
                  if ((e as Error).name === 'AbortError') return;
                  console.warn(`NWS retry failed for ${dest.id}:`, e);
                }
              }
            })(),
          );
        }

        await Promise.allSettled(workers);
        set({ retrying: false });
      },

      setDetailId: (id: string | null) => set({ detailId: id }),

      setSelectedId: (id: string | null) => set({ selectedId: id }),

      clearDetailIfFiltered: (filteredIds: Set<string>) => {
        const { detailId } = get();
        if (detailId && !filteredIds.has(detailId)) {
          set({ detailId: null });
        }
      },
    }),

    // ── persist config ─────────────────────────────────────────────────
    {
      name: '_v1_dtp',
      version: 1,
      storage: mmkvStorage<Partial<DTPState>>(),
      skipHydration: true,
      // Only persist user preferences; ephemeral fetch state is always reset.
      partialize: (state) => ({
        selectedHubId: state.selectedHubId,
        windowHours: state.windowHours,
        tempUnit: state.tempUnit,
        selectedReasons: state.selectedReasons,
      }),
      onRehydrateStorage: () => (hydratedState) => {
        if (!hydratedState) return;
        // Validate selectedHubId — fall back to default if unknown.
        if (!HUBS_BY_ID.has(hydratedState.selectedHubId)) {
          hydratedState.selectedHubId = defaultHub.id;
        }
        // Validate selectedReasons — filter out any unknown values.
        hydratedState.selectedReasons = (hydratedState.selectedReasons ?? []).filter(
          (r) => VALID_REASONS.has(r),
        ) as ReasonsToVisit[];
        // Validate windowHours — must be a [number, number] tuple within [0, 24].
        const [s, e] = hydratedState.windowHours ?? [];
        if (
          typeof s !== 'number' || typeof e !== 'number' ||
          s < 0 || s > 24 || e < 0 || e > 24
        ) {
          hydratedState.windowHours = DEFAULT_WINDOW;
        }
        // Validate tempUnit.
        if (hydratedState.tempUnit !== 'F' && hydratedState.tempUnit !== 'C') {
          hydratedState.tempUnit = 'F';
        }
      },
    },
  ),
);

// ── hydration helper ───────────────────────────────────────────────────────

/**
 * Call once after app mount. Reads persisted keys from MMKV into the store.
 * Because MMKV is synchronous this completes before the next paint.
 * The skipHydration flag was set so we can call this imperatively here
 * rather than having Zustand race against React's first render.
 */
export function hydrateStore(): void {
  void useStore.persist.rehydrate();
}
