# Phase 4 + 4b FIX_LOG

## Pass 1 — Reviewer fan-out (3 BLOCKERs + 4 MAJORs)

### BLOCKERs fixed

**BLOCKER 1 — App.tsx layout switch causing full remount on rotation / Slide Over**
Approach A. App.tsx now always renders `<MainScreenIPad />`. MainScreenIPad's
`shouldUseIPadLayout` predicate returns false on non-iPad devices and on iPad
Slide Over < 600pt; the fallback path now renders `<MainScreenPhone />`
imported statically at module top (the previous dynamic `require('./MainScreenPhone')`
inside render, kept as a Phase 4 safety net during the parallel window, has been
removed). Result: identical user-visible behavior, but a single root component
keeps the WebView mounted across screen swaps.

App.tsx changes:
- Removed `useWindowDimensions` + `Platform` + `MainScreenPhone` + `shouldUseIPadLayout`
  imports.
- Removed the conditional `Screen = … ? MainScreenIPad : MainScreenPhone`.
- Added `useAppStateRefresh(hydrated)` hook (see MAJOR 7).

**BLOCKER 2 — First-mount SET_PINS race**
Verified against `src/map/outbox.ts` and `src/components/MapWebView.tsx`:
- The Outbox queues all messages until `MAP_READY`, and gates non-INIT messages
  until `MAP_INITIALIZED`.
- `MapWebView`'s imperative handle (`setPins`, `flyTo`, `setSelected`) all go
  through `outbox.enqueue`, which means the screen-level effects can fire
  before the WebView is initialized without losing messages — the outbox
  buffers them and the MAP_INITIALIZED replay path additionally re-emits
  SET_PINS / SET_SELECTED from the persisted snapshot.
- Conclusion: no real race. BLOCKER 2 is **closed by inspection** without a
  ready-gate or onReady prop. The comment in MainScreenPhone's hub-switch
  effect ("// map not initialized yet") is preserved as a defensive guard
  that prevents redundant SET_PINS before the FIRST INIT lands.

**BLOCKER 3 — TileFallbackBanner contrast**
`src/components/TileFallbackBanner.tsx:51` `colors.slate700` → `colors.slate800`.

### MAJORs fixed

**MAJOR 4 — `clearDetailIfFiltered` running every render due to unmemoized derivation**
Both screens now wrap `filteredRows` and `mapPins` in `useMemo` with explicit
deps `[weatherByDest, selectedDay, windowHours, selectedReasons, hub]` (and
`selectedId` for `mapPins`). The `clearDetailIfFiltered` effect's `filteredRows`
dep then triggers only when the memoized array identity actually changes
(proxy-memoize on the selector keeps that identity stable when inputs are
unchanged).

**MAJOR 5 — Wide store subscriptions**
Both screens now read state via `useStore(useShallow((s) => ({ … })))` instead
of one subscription per field. This eliminates re-renders for unrelated state
slices (failedIds, retrying, fetchEpoch, etc.). `weatherByDest` still triggers
re-render on every NWS arrival because `setWeatherForDest` creates a new
object reference — but that is necessary for pin colors to update, and the
proxy-memoize selector + new `useMemo` cap the downstream cost.

**MAJOR 6 — `JSON.stringify(mapPins)` on every render**
Both screens now do `const mapPinsJson = useMemo(() => JSON.stringify(mapPins), [mapPins])`
and the effect compares `mapPinsJson` against the ref. With `mapPins` itself
memoized (MAJOR 4), the stringify only runs when pin data actually changes.

**MAJOR 7 — Dual AppState listeners in both screens**
Lifted to `App.tsx`. Removed `AppState.addEventListener` from both
`MainScreenPhone.tsx` and `MainScreenIPad.tsx` (and the screen-level
`backgroundedAtRef`). Added two new store actions in `src/store/index.ts`:
- `markBackgrounded()` — records `Date.now()` to `_lastBackgrounded`.
- `refetchIfStale()` — if `Date.now() - _lastBackgrounded > 60_000`, calls
  `setHub(selectedHubId)` to bump fetchEpoch and re-fetch weather.

`App.tsx` `useAppStateRefresh(hydrated)` subscribes once and dispatches these
actions. Map heartbeat is unchanged: `MapWebView` keeps its own internal
AppState listener for WebView staleness (heartbeat → forceReload), independent
of the screen-level refetch.

Selectors (frozen at Phase 2.5) were not modified; only the store body
(`src/store/index.ts`) gained two state fields and two actions, which is
allowed because only `selectors.ts` is frozen.

### Verification

- `npx tsc --noEmit` → exit 0
- `npm test` → 14 suites, 118 tests pass
- `grep useShallow MainScreenPhone.tsx MainScreenIPad.tsx` → both match
- `grep -c AppState.addEventListener MainScreenPhone.tsx` → 0
- `grep -c AppState.addEventListener MainScreenIPad.tsx` → 0
- `grep -c AppState.addEventListener App.tsx` → 1
- `grep MainScreenIPad App.tsx` → match (always rendered)
- `grep import.*MainScreenPhone MainScreenIPad.tsx` → top-level static import
- `grep useMemo` in both screens → present
- `grep colors.slate800 TileFallbackBanner.tsx` → match
- `git diff --stat` of `theme / icons / bridge-protocol.ts / selectors.ts` → empty
- Tracked-file diff: ~117 added/removed lines (App.tsx + store/index.ts);
  untracked-file edits to MainScreenPhone, MainScreenIPad, TileFallbackBanner
  remain well under the 200-line cap.

### Deferred items (not addressed in Pass 1)

- **TileFallbackBanner not yet wired into MainScreenIPad.** The iPad screen
  doesn't render `<TileFallbackBanner hasTileError={…} />` and doesn't track
  the `onTileError` callback. Phone-only banner is acceptable for v1; iPad
  fallback signaling can land in a follow-up.
- **IPadDetailPanel slide animation cleanup.** The panel uses
  `Animated.timing` with `useNativeDriver: true` but never calls `.stop()`
  on unmount. Low impact (animation completes within 240ms even if interrupted),
  but a `useEffect` cleanup would be safer.
- **Hydration order verification.** `App.tsx` pre-seeds deep-link state,
  hydrates MMKV, then re-applies deep-link state. The "re-apply" step assumes
  `setState` in onRehydrateStorage doesn't fire after our re-apply — verified
  by skipHydration + imperative `useStore.persist.rehydrate()`, but a unit
  test pinning the order would harden this.
- **Unused `loading` subscription in MainScreenPhone.** `loading` is read
  via useShallow but the phone screen doesn't render it (only IPad's
  DestinationList consumes it). Cheap to leave; can be pruned later.
- **Header tab-order observation.** On iPad in landscape the header has
  HubPicker → WhenPicker → ReasonChips → SettingsMenu. Tab/focus order
  should be verified with a real VoiceOver pass; the markup order suggests
  it's correct, but no automated coverage exists.
