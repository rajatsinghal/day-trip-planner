# Phase 2 Fix Log

## Pass 1 — 2026-04-20

### Blockers fixed

**1. [BLOCKER] Atomic epoch check in setWeatherForDest and retryFailed**
`mobile/src/store/index.ts`
Moved the epoch guard INSIDE the `set()` callback for both `setWeatherForDest` and the retry worker's write, so the check and mutation are atomic from Zustand's perspective. Previously a `setHub()` call racing between the `get()` and the `set()` could slip through.

**2. [BLOCKER] JSON.parse safety in MMKV adapter**
`mobile/src/store/persist.ts`
Wrapped `JSON.parse` in try/catch. On `SyntaxError` (corrupted key), calls `getMMKV().delete(name)` and returns `null` so the store boots with defaults rather than crashing.

### Majors fixed

**3. [MAJOR] Re-validate persisted state on hydration**
`mobile/src/store/index.ts` + `mobile/src/lib/linking.ts`
Added `onRehydrateStorage` to the persist config. Validates:
- `selectedHubId` against `HUBS_BY_ID`; falls back to `defaultHub.id`.
- `selectedReasons` filtered to `VALID_REASONS` (unknown values dropped).
- `windowHours` checked as `[number, number]` in [0, 24]; resets to `DEFAULT_WINDOW`.
- `tempUnit` must be `'F'` or `'C'`; defaults to `'F'`.
Exported `VALID_REASONS` from `linking.ts` for reuse.

**4. [MAJOR] Length caps on linking parser**
`mobile/src/lib/linking.ts`
- Early return if `url.length > 2048` or non-string.
- hubId capped at 64 chars before map lookup.
- Reasons CSV entries capped at 50 before filtering.

**5. [MAJOR] Selector memoization**
`mobile/src/store/selectors.ts`
Installed `proxy-memoize`. Wrapped `selectEnrichedRows`, `selectFilteredRows`, and `selectMapPins` with `memoize()`. Selectors now only recompute when the accessed properties of their arguments actually change. `selectDisplayWindow` and `selectAnyFailed` are cheap enough to skip.

**6. [MAJOR] Promise.allSettled in fetchWeather**
`mobile/src/store/fetchWeather.ts`
Changed `Promise.all(workers)` to `Promise.allSettled(workers)`. Iterates results and logs any `rejected` statuses via `console.warn`. A single worker exception no longer tears down the whole batch.

**7. [MAJOR] retryFailed aborts existing controller**
`mobile/src/store/index.ts`
`retryFailed` now calls `state._abortController?.abort()` before creating a new `AbortController`, then stores the new controller via `set()`. Prevents orphaned in-flight fetches from a prior retry or hub fetch overlapping a retry.

**8. [MAJOR] finishedWorkers off-by-one in fetchWeather**
`mobile/src/store/fetchWeather.ts`
Removed the `finishedWorkers` counter entirely. `setLoading(false)` is now called once after `Promise.allSettled(workers)` resolves, which is both correct (fires exactly when all workers are done) and simpler. The old condition `finishedWorkers === FETCH_CONCURRENCY` could never fire when the queue was shorter than `FETCH_CONCURRENCY`.

**9. [MAJOR] fetchWeather getState() inconsistency**
`mobile/src/store/fetchWeather.ts`
Removed the up-front destructured bindings (`setWeatherForDest`, `markFailed`, `setLoading`) and the `void` suppressions that hid the bug. All store access now uses live `useStore.getState()` calls, which is correct: captured bindings would have closed over the initial function references but the epoch checks require reading current state anyway.

**10. [MAJOR] Smoke test for atomic epoch race**
`mobile/__tests__/store-race.smoke.test.ts`
Added test `'drops write when epoch becomes stale between read and write'` that calls `setHub('seattle')`, captures the epoch, calls `setHub('austin')` to bump the epoch, then calls `setWeatherForDest` with the stale epoch. Asserts the write is a no-op.

### Deferred items (for later phases)

- **hydrateStore() invocation — Phase 4 must call this** — `hydrateStore()` is exported from `mobile/src/store/index.ts` and the persist config sets `skipHydration: true`. Phase 4's MainScreen wiring MUST call `hydrateStore()` once on mount (after deep-link parse) or persisted state will be silently lost on every launch.
- **clearDetailIfFiltered Phase 4 wiring** — the action exists but callers in the UI layer have not yet been wired up to invoke it when `filteredRows` changes.
- **pin-loading-selected sprite variant** — the `selectMapPins` selector emits `'pin-loading'` for unresolved weather even when `isSelected`; the selected loading variant (`'pin-loading-selected'`) is not yet produced or sprited.
- **accessibility loading-progress derivation** — a `loadingProgress: number` derived value (resolved / total destinations) has been flagged for Phase 3 accessibility work; it is not yet in the store or selectors.

## Pass 2 — final touchup

Two minor items surfaced in the round-2 reviewer fan-out:

**M1. markFailed atomic epoch check.** `markFailed` now accepts an optional `epoch` argument and drops the write inside its `set()` callback when stale. Same atomic pattern as `setWeatherForDest`. fetchWeather worker pool now passes the captured epoch on every `markFailed` call, eliminating the residual race where a `setHub` between the epoch check and the call could mis-attribute a failure.

**M2. Test isolation: real NWS network calls escaping tests.** `store-race.smoke.test.ts` now mocks `fetchWeather` via `jest.mock(...)` so `setHub` does not spawn real workers that hit `api.weather.gov`. Also added an `afterAll` and a `beforeEach` controller abort to guarantee no in-flight controllers leak between or after tests. Eliminates the "Cannot log after tests are done" warnings.
