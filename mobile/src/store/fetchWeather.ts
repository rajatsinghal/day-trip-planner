// Concurrency-limited NWS worker pool.
// Mirrors the web App.tsx worker-pool pattern (lines 192-228) but
// lives outside React: results are written directly into the Zustand store
// via setWeatherForDest, which silently drops them if the epoch is stale.

import type { Hub } from '@dtp/core';
import { fetchNwsForDest } from '../lib/nws';
import { useStore } from './index';

export const FETCH_CONCURRENCY = 8;

/**
 * Fetch weather for every destination in `hub`, up to FETCH_CONCURRENCY
 * concurrent requests. Each result is written via the store's
 * setWeatherForDest(id, result, epoch) which rejects writes whose epoch
 * does not match the store's current fetchEpoch (race protection).
 *
 * @param hub    The hub whose destinations to fetch.
 * @param epoch  The fetchEpoch value at the time setHub was called.
 *               Results arriving after a hub switch carry the old epoch
 *               and are silently discarded.
 * @param signal AbortSignal from the AbortController stored in the store.
 *               Aborted when a subsequent setHub() call fires.
 */
export async function fetchWeather(
  hub: Hub,
  epoch: number,
  signal: AbortSignal,
): Promise<void> {
  const queue = [...hub.destinations];
  const workerCount = Math.min(FETCH_CONCURRENCY, queue.length);

  async function worker(): Promise<void> {
    while (queue.length > 0 && !signal.aborted) {
      const dest = queue.shift();
      if (!dest) break;
      try {
        const wx = await fetchNwsForDest(dest, signal);
        // Race protection: setWeatherForDest checks epoch atomically inside set().
        useStore.getState().setWeatherForDest(dest.id, wx, epoch);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        console.warn(`NWS fetch failed for ${dest.id}:`, e);
        // markFailed uses the same atomic epoch check as setWeatherForDest.
        useStore.getState().markFailed(dest.id, epoch);
      }
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  // Promise.allSettled: a single worker rejection doesn't tear down the batch.
  const results = await Promise.allSettled(workers);
  results.forEach((r) => {
    if (r.status === 'rejected') {
      console.warn('fetchWeather worker rejected unexpectedly:', r.reason);
    }
  });

  // Clear loading flag once all workers are done and epoch is still ours.
  if (!signal.aborted && epoch === useStore.getState().fetchEpoch) {
    useStore.getState().setLoading(false);
  }
}
