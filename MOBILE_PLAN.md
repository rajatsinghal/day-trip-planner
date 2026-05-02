# Mobile port: design and agentic dev plan (v2)

Plan for shipping the day-trip-planner as native iOS and Android apps
using a hybrid architecture: an Expo/React Native shell with a
MapLibre GL JS map embedded via `react-native-webview`.

The plan is structured so that each phase is an **agent-driven task**
with explicit PASS/FAIL criteria expressed as commands. The agentic
cycle is develop → validate → fix, looped until a phase passes. Human
engagement is limited to phase-boundary sign-off and the one phase
that genuinely requires a physical device (Phase 5).

**v2 changes:** based on review feedback. Major revisions to §4
(bridge protocol — handshake inversion, message queue, recovery
messages), §6 Phase 1 (sprite-sheet pins, inlined HTML, process-death
recovery), §6 Phase 2 (full state shape, race protection), new §6
Phase 2.5 (shared primitives lock), §7 (PASS criteria become explicit
commands; fix-log; diff cap), and new §12 (v1 scope decisions).

---

## 1. Why hybrid

Both pure approaches have known, documented issues:

- **Capacitor (full web-app-in-WebView):** architectural WebGL
  ceiling in WKWebView; 110+ DOM-based markers panning in a WebView
  will feel worse than native; App Store 4.2 (thin-wrapper) risk.
- **Expo with `@maplibre/maplibre-react-native`:** known Android
  stability issues (tile-loading "Canceled" errors, GZIP bugs);
  smaller API surface than MapLibre GL JS; requires native build for
  the map itself.

The hybrid split avoids both:

- **Map** = MapLibre GL JS (web, battle-tested) inside a `react-native-webview`.
- **Everything else** = native Expo/React Native.

This preserves the existing map implementation almost verbatim while
giving the rest of the app native feel, native scroll, native nav,
and native data/state ownership.

---

## 2. Architecture

```
┌────────────────────────────────────────────────────────────────┐
│ Native Expo App (React Native)                                 │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────┐    │
│  │ Zustand store        │  │ UI (all native components)   │    │
│  │  selectedHubId       │  │   HubPicker                  │    │
│  │  selectedDay         │  │   WhenPicker                 │    │
│  │  windowHours         │  │   ReasonFilter               │    │
│  │  tempUnit            │  │   DestinationList (FlatList) │    │
│  │  selectedReasons     │  │   BottomCardStrip            │    │
│  │  weatherByDest       │  │   MobileDetailSheet          │    │
│  │  loading             │  │   SettingsMenu               │    │
│  │  failedIds           │  │   RetryBanner                │    │
│  │  retrying            │  │                              │    │
│  │  detailId            │  │                              │    │
│  │  (MMKV persistence)  │  │                              │    │
│  └──────────┬───────────┘  └──────────────┬───────────────┘    │
│             │                             │                     │
│             ▼                             ▼                     │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ MapWebView.tsx (react-native-webview + outbox)       │      │
│  │   bundles map.html (MapLibre GL JS inlined)          │      │
│  │   typed postMessage protocol with seq + queue        │      │
│  │   process-death recovery (iOS + Android)             │      │
│  │                                                       │      │
│  │   ┌─────────────────────────────────────────────┐    │      │
│  │   │ map.html (WebView)                          │    │      │
│  │   │   MapLibre GL JS (inlined)                  │    │      │
│  │   │   Sprite-sheet symbol layer for pins        │    │      │
│  │   │   webglcontextlost handler                  │    │      │
│  │   └─────────────────────────────────────────────┘    │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ packages/core (workspace package, shared with web)   │      │
│  │   weather.ts, geo.ts, days.ts, units.ts             │      │
│  │   reasons_to_visit/ (data only)                     │      │
│  │   hubs/ (data only)                                 │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ mobile/src/lib (mobile-specific)                     │      │
│  │   nws.ts (MMKV)  reasons_to_visit_icons (RN-SVG)    │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
         │                                        │
         ▼                                        ▼
  api.weather.gov                         tiles.openfreemap.org
  (fetched from native)                   (fetched from WebView)
```

**v1 platform scope:** iPhone, iPad (with tablet-optimized layout),
Android phone. Android tablet ships as phone-compat in v1. See §12.

---

## 3. The split: native vs WebView

| Concern | Runs where | Rationale |
|---|---|---|
| NWS fetching + cache | Native | Async iteration, no CORS, MMKV cache |
| State management | Native | Zustand store; single source of truth |
| Hub / day / window / filter UI | Native | Native scroll, native gestures |
| Destination list | Native | `FlatList` virtualization for 100+ items |
| Bottom card strip | Native | Native paging / snap |
| Detail sheet | Native | Native `Modal` + `Animated` |
| Retry banner | Native | Standard RN component |
| **Map rendering** | **WebView** | MapLibre GL JS only; avoids MapLibre RN Android bugs |
| Pin tap / fly-to / viewport | WebView ↔ Native via bridge | Map emits events; native owns logic |
| Tile fetching | WebView | Standard MapLibre behavior; tiles cached in WebView |

---

## 4. Bridge protocol (v2)

Typed `postMessage` contract. Defined once in
`mobile/src/map/bridge-protocol.ts` and imported by both sides.

### 4.1 Handshake — map-first

Inversion of v1: the **map** announces readiness; the native side
sends `INIT` only after `MAP_READY`. Avoids the race where
`injectJavaScript('handleNativeMessage(...)')` fires before
`window.handleNativeMessage` is registered in the WebView.

```
Mount: Native creates WebView with empty source URL replaced by inlined HTML.
WebView: index.html runs, registers window.handleNativeMessage, posts MAP_READY.
Native: on MAP_READY, posts INIT, flushes outbox.
WebView: on INIT, initializes MapLibre, mounts sprite sheet, posts MAP_INITIALIZED.
Native: on MAP_INITIALIZED, sends first SET_PINS.
```

Until `MAP_INITIALIZED`, all native-originated messages other than
`INIT` are queued in the **outbox**. The outbox flushes on
`MAP_INITIALIZED` and is cleared on any reload.

### 4.2 Message queue and seq numbers

Every native → map message carries a monotonic `seq: number`. Map
tracks `lastAppliedSeq` per message type. Out-of-order or stale
messages are dropped:

- `SET_PINS` with `seq < lastAppliedSeq[SET_PINS]` → ignored.
- `FLY_TO` with `seq < lastAppliedSeq[FLY_TO]` → ignored.

This prevents a slow `SET_PINS` for hub A landing after a fresh
`INIT` for hub B from corrupting the display. Native bumps `seq` on
every outbound message; the outbox stamps `seq` at flush time, not
enqueue time.

### 4.3 Native → Map

```ts
type NativeToMap =
  | { type: 'INIT'; seq: number;
      center: { lat: number; lon: number; name: string };
      styleUrl: string; isDarkMode: boolean }
  | { type: 'SET_PINS'; seq: number; hubId: string; pins: MapPin[] }
  | { type: 'FLY_TO'; seq: number; destId: string }
  | { type: 'SET_SELECTED'; seq: number; destId: string | null }
  | { type: 'SET_STYLE'; seq: number; styleUrl: string; isDarkMode: boolean }
  | { type: 'HEARTBEAT'; seq: number; nonce: string };

interface MapPin {
  id: string;
  lat: number;
  lon: number;
  iconImage: string;       // sprite key e.g. "pin-sunny"
  selected: boolean;       // collapses web's selected || hovered — there is no hover on touch
  loading: boolean;        // true → uses neutral loading sprite
}
```

`HEARTBEAT` is used post-resume to detect a dead JS context (no
response within 1500ms → treat as dead, full reload).

### 4.4 Map → Native

```ts
type MapToNative =
  | { type: 'MAP_READY' }
  | { type: 'MAP_INITIALIZED'; styleLoaded: boolean }
  | { type: 'PIN_TAPPED'; destId: string }
  | { type: 'TILE_ERROR'; sourceId: string; status?: number; url: string }
  | { type: 'MAP_ERROR'; code: 'webgl-context-lost' | 'style-load-failed' | 'unknown'; message: string }
  | { type: 'HEARTBEAT_ACK'; nonce: string }
  | { type: 'LOG'; level: 'info' | 'warn' | 'error'; message: string };
```

`LOG` exists so the WebView can surface debug info to native console
without `console.log` being silently dropped.

### 4.5 Recovery — process death and WebGL context loss

Three failure modes, three handlers:

1. **WebGL context lost** (older iOS, GPU pressure): map.html
   listens for `webglcontextlost`, posts `MAP_ERROR` with code
   `webgl-context-lost`. Native calls `webViewRef.reload()` and
   re-handshakes from scratch.
2. **WebView content process terminated** (iOS 17/18 memory kill):
   native uses
   `react-native-webview`'s `onContentProcessDidTerminate` (iOS) and
   `onRenderProcessGone` (Android) callbacks. Native calls
   `.reload()` and re-handshakes. Note: on Android,
   `onRenderProcessGone` only fires on hard render-process crashes,
   not on the more common SurfaceView-destroyed-while-backgrounded
   case — the heartbeat below is the primary Android post-resume
   recovery path.
3. **AppState `active` post-resume** (primary Android resume path):
   native sends `HEARTBEAT`. If no `HEARTBEAT_ACK` within 1500ms,
   treat as dead → `.reload()` + re-handshake. If ACK arrives, just
   refresh pins (cheap path).

After any reload, native resends in order: `INIT` → `SET_PINS`
(current hub) → `SET_SELECTED` (current selection).

### 4.6 Transport

- **Native → Map:**
  `webViewRef.current.injectJavaScript('window.handleNativeMessage(' + JSON.stringify(msg) + ');true;')`.
  Trailing `true;` is required to avoid an iOS WKWebView bug
  returning non-string. The outbox flush loop runs on the native JS
  thread (not the WebView renderer), so it must use
  `setTimeout(flushNext, 0)` between messages — `requestAnimationFrame`
  does not exist on the native JS thread and would silently break the
  flush loop. The `seq` counter is owned by the flush loop, stamped
  at flush time, not at enqueue time.
- **Map → Native:** `window.ReactNativeWebView.postMessage(JSON.stringify(msg))`;
  native receives via `onMessage` prop with a 64KB payload cap
  (multi-message pin sets must batch into one).

### 4.7 Invariants

1. Map ignores all messages until handler is registered (`MAP_READY` posted first).
2. Native does not send map messages until `MAP_INITIALIZED` (queue them).
3. `SET_PINS` always carries the full pin set, never deltas.
4. `seq` is monotonic per direction; map drops stale messages by `seq`.
5. All messages are JSON-serializable (no functions, Dates, undefined).
6. WebView reload always restarts the handshake from `MAP_READY`.

---

## 5. Project structure

Monorepo workspace approach (npm workspaces). Two consumers — the
existing web app and the new mobile app — share a `core` package.
Replaces v1's fragile `sync-shared.ts` script.

```
day-trip-planner/                   # repo root, npm workspace root
├── package.json                    # "workspaces": ["packages/*", "mobile", "."]
├── packages/
│   └── core/                       # NEW — shared logic
│       ├── package.json            # name: "@dtp/core"
│       ├── src/
│       │   ├── weather.ts          # moved from src/lib/
│       │   ├── geo.ts
│       │   ├── days.ts
│       │   ├── units.ts
│       │   ├── reasons_to_visit.ts # data only — no JSX
│       │   └── hubs/               # all hub data
│       └── tsconfig.json
│
├── src/                            # existing web app
│   ├── lib/                        # nws.ts (web), reasons_to_visit.tsx (web SVG)
│   └── components/                 # imports @dtp/core
│
└── mobile/                         # NEW — Expo app
    ├── app.json
    ├── package.json                # depends on @dtp/core
    ├── tsconfig.json
    ├── App.tsx
    ├── assets/
    │   ├── map.html                # single self-contained file
    │   ├── sprites/                # PNG sprites + JSON sidecar
    │   └── splash/icon assets
    ├── src/
    │   ├── screens/MainScreen.tsx
    │   ├── components/
    │   │   ├── MapWebView.tsx
    │   │   ├── DestinationList.tsx
    │   │   ├── BottomCardStrip.tsx
    │   │   ├── MobileDetailSheet.tsx
    │   │   ├── HubPicker.tsx
    │   │   ├── WhenPicker.tsx
    │   │   ├── HourRangeSlider.tsx
    │   │   ├── DayChips.tsx
    │   │   ├── ReasonFilter.tsx
    │   │   ├── SettingsMenu.tsx
    │   │   └── RetryBanner.tsx
    │   ├── store/
    │   │   ├── index.ts            # Zustand store
    │   │   ├── selectors.ts        # frozen selector API (Phase 2.5)
    │   │   ├── persist.ts          # MMKV adapter
    │   │   └── fetchWeather.ts     # NWS worker pool
    │   ├── theme/                  # frozen tokens (Phase 2.5)
    │   │   ├── colors.ts
    │   │   ├── spacing.ts
    │   │   └── typography.ts
    │   ├── map/
    │   │   └── bridge-protocol.ts  # frozen types (Phase 2.5)
    │   ├── icons/                  # react-native-svg icons (Phase 2.5)
    │   │   ├── WaterfallIcon.tsx
    │   │   ├── MuseumIcon.tsx
    │   │   └── reason-icon.tsx
    │   └── lib/
    │       ├── nws.ts              # MMKV port
    │       └── linking.ts          # deep link parser
    ├── __tests__/                  # smoke tests per phase
    └── eas.json
```

**CI drift check:** A workspace package eliminates duplication —
no drift possible. As insurance, a CI job on every PR runs
`tsc --noEmit` across both `src/` and `mobile/` to catch any
breaking change to `@dtp/core`.

---

## 6. Dev phases

Each phase is a discrete agent task with explicit PASS/FAIL
criteria expressed as commands. Phases 0 → 2 → 2.5 are sequential.
Phase 3 is parallel across 5 components, gated on Phase 2.5.
Phase 4 integrates. Phase 5 is the one human-touched phase.

### Phase 0 — Scaffold + monorepo + observability

**Agent:** `general-purpose`, sonnet, single agent.

**Scope:**
- Convert repo to npm workspaces. Create `packages/core/`. Move
  pure-TS files from `src/lib/` and `src/hubs/` into
  `packages/core/src/`. Update web `src/` imports to `@dtp/core`.
  Web app must continue to typecheck and build.
- Init Expo SDK 52+ TypeScript project at `mobile/` (strict mode).
- Install: `react-native-webview`, `react-native-mmkv`, `zustand`,
  `react-native-svg`, `react-native-gesture-handler`,
  `react-native-reanimated`, `@expo/vector-icons`,
  `@sentry/react-native`, `expo-linking`, `expo-application`.
- Configure `app.json`: bundle IDs, splash, icon (placeholders OK),
  `requireFullScreen: true` (defers iPad layout work — see §12),
  Linking scheme `dtp://`.
- Configure `eas.json` with three profiles: `development`
  (dev-client), `preview` (internal TestFlight/internal track),
  `production`. Documents but does not yet provision Apple/Android
  credentials (see §12, deferred to launch).
- Install Sentry; wire `init()` in `App.tsx` with a placeholder DSN
  env var. Crash measurement in §11 depends on this.
- Port `mobile/src/lib/nws.ts`: swap `localStorage` for MMKV (sync API).
  Preserve all current behavior including `fetchedAt` field.
- Port `mobile/src/icons/` from `src/lib/reasons_to_visit.tsx`:
  `WaterfallIcon` and `MuseumIcon` rebuilt with `react-native-svg`.
- Stub `App.tsx` rendering "Hello" + Sentry init.
- Run `npx expo prebuild` to generate `ios/` and `android/`.

**Validation (commands, every one must run + transcript in report):**

| Check | Command | Expected |
|---|---|---|
| Workspace links resolve | `npm ls @dtp/core --workspaces` | both web + mobile show `@dtp/core` |
| Web app still typechecks | `cd /Users/rajatsinghal/Code/day-trip-planner && npx tsc --noEmit -p tsconfig.app.json` | exit 0 |
| Web app still builds | `npm run build` | exit 0 |
| Mobile typecheck | `cd mobile && npx tsc --noEmit` | exit 0 |
| Mobile prebuild | `cd mobile && npx expo prebuild --clean` | exit 0; `ios/` and `android/` exist |
| Mobile export | `cd mobile && npx expo export` | exit 0 |
| No `localStorage` in mobile | `grep -rn "localStorage" mobile/src` | no matches |
| No web SVG JSX in mobile icons | `grep -rEn "<(svg\|path\|rect\|line\|circle\|ellipse) " mobile/src/icons` | no matches |
| Sentry initialized | `grep -n "Sentry.init" mobile/App.tsx` | exactly 1 match |

---

### Phase 1 — Map WebView (sprite sheet, inlined HTML, recovery)

**Agent:** `general-purpose`, opus, single agent.

**Scope:**
- Create `mobile/src/map/bridge-protocol.ts` with the v2 type unions
  from §4.3, §4.4. Frozen as of this phase — see Phase 2.5.
- Create `mobile/assets/map.html`:
  - **Inline** MapLibre GL JS (vendored + inlined at build time
    via small `mobile/scripts/build-map-html.ts`). No sibling JS
    files — single self-contained HTML. Bundle target ≤ 1.2 MB.
  - Inline a simple message-handler bootstrap that registers
    `window.handleNativeMessage` synchronously and immediately
    posts `MAP_READY`. INIT is buffered (queue) until handler is
    fully ready — though handler-first registration plus map-first
    handshake makes this a defense-in-depth measure.
  - Renders pins as a **GeoJSON symbol layer** with `icon-image`
    pointing to a sprite sheet. No `text-field` (emoji-as-text is
    unreliable across platforms).
  - **Sprite generation:** `mobile/scripts/build-sprites.ts`
    pre-renders one PNG per (weather code × selected? × loading?)
    composite — circle background colored per weather, emoji
    centered, optional selection ring. Output: `assets/sprites.png`
    + `assets/sprites.json` (1x and 2x). Loaded via MapLibre's
    `addSprite`.
  - Tap detection: `map.on('click', 'pins-layer', e => post PIN_TAPPED)`.
  - Listens for `webglcontextlost` → posts `MAP_ERROR` with code
    `webgl-context-lost`.
  - Style URL passed via `INIT` (OpenFreeMap Positron, same as web);
    light/dark switch via `SET_STYLE`.
  - Home pin rendered separately as a `Marker` (single non-perf-critical
    DOM element) — keeps the 🏠 + center.name tooltip from current web map.
- Create `mobile/src/components/MapWebView.tsx`:
  - `WebView` with `source={{ html: inlinedHtml, baseUrl: 'https://localhost' }}`
    (HTTPS baseUrl on Android prevents mixed-content blocking on
    OpenFreeMap tiles).
  - Props: `mixedContentMode="always"`, `originWhitelist={['*']}`,
    `allowFileAccessFromFileURLs`, `allowUniversalAccessFromFileURLs`,
    `javaScriptEnabled`, `domStorageEnabled`,
    `onContentProcessDidTerminate` (iOS), `onRenderProcessGone`
    (Android).
  - Implements **outbox**: messages enqueued before
    `MAP_INITIALIZED` are buffered; on `MAP_INITIALIZED` they flush
    in order, one per `requestAnimationFrame`.
  - Implements **seq numbers**: monotonic counter, stamped at
    flush time.
  - Implements **heartbeat**: on `AppState 'active'` after a prior
    background, send `HEARTBEAT` with random nonce; if no
    `HEARTBEAT_ACK` within 1500ms → `.reload()` and re-handshake.
  - Imperative handle via `forwardRef`: `setPins`, `flyTo`,
    `setSelected`, `setStyle`, `forceReload`.
  - On any reload: re-INIT, re-SET_PINS (current hub), re-SET_SELECTED.

**Validation (commands):**

| Check | Command | Expected |
|---|---|---|
| Typecheck | `cd mobile && npx tsc --noEmit` | exit 0 |
| Bridge has all v2 types | `grep -cE "type: 'INIT'\|'SET_PINS'\|'FLY_TO'\|'SET_SELECTED'\|'SET_STYLE'\|'HEARTBEAT'" mobile/src/map/bridge-protocol.ts` | ≥ 6 |
| Native handles all Map→Native | `grep -cE "case 'MAP_READY'\|'MAP_INITIALIZED'\|'PIN_TAPPED'\|'TILE_ERROR'\|'MAP_ERROR'\|'HEARTBEAT_ACK'\|'LOG'" mobile/src/components/MapWebView.tsx` | = 7 |
| No DOM markers | `grep -rn "new maplibregl.Marker" mobile/assets/map.html` | only home pin (1 match) |
| Sprite layer present | `grep -n "addLayer\|symbol" mobile/assets/map.html` | ≥ 1 each |
| Process-death handlers wired | `grep -E "onContentProcessDidTerminate\|onRenderProcessGone" mobile/src/components/MapWebView.tsx` | both present |
| WebGL loss handler in HTML | `grep "webglcontextlost" mobile/assets/map.html` | 1 match |
| HTML inlined size | `wc -c mobile/assets/map.html` | < 1300000 bytes |
| Smoke test | `cd mobile && npm test -- bridge-handshake.smoke.test` | exit 0 — asserts native sends `INIT` only after `MAP_READY`, queues other messages, drops stale-seq messages |
| Smoke test content check | `grep -E "MAP_READY.*INIT\|stale.*seq\|outbox" mobile/__tests__/bridge-handshake.smoke.test.ts` | ≥ 3 matches |

The smoke test runs against a mocked WebView and verifies the
outbox/seq logic without needing a real device.

---

### Phase 2 — State layer (full shape, race protection)

**Agent:** `general-purpose`, sonnet, single agent.

**Scope:**

Create `mobile/src/store/index.ts`. Slices match App.tsx exactly:

```ts
interface DTPState {
  // persisted
  selectedHubId: string;
  windowHours: [number, number];
  tempUnit: 'F' | 'C';
  selectedReasons: ReasonsToVisit[];

  // ephemeral
  selectedDay: DayOption;
  weatherByDest: Record<string, NwsWeatherResponse>;
  loading: boolean;            // true while initial fetch running
  failedIds: Set<string>;      // destinations whose fetch failed
  retrying: boolean;           // disables retry button while in flight
  detailId: string | null;     // mobile detail sheet open state
  selectedId: string | null;   // map flies to this; list highlights this

  // current-fetch identity (race protection)
  fetchEpoch: number;          // bumps on every hub switch
}
```

Actions: `setHub` (bumps `fetchEpoch`, clears
`weatherByDest`/`failedIds`, triggers fetch), `setDay`, `setWindow`,
`setTempUnit`, `toggleReason`, `setWeatherForDest(id, result, epoch)`
(rejects writes whose epoch != current — race protection),
`setLoading`, `markFailed`, `retryFailed`, `setDetailId`,
`setSelectedId`.

**MMKV persistence:** custom Zustand storage adapter wrapping the
sync MMKV API. Use `skipHydration: true` and gate first paint on a
`useHydration()` hook to avoid flash-of-defaults. Persisted keys
prefixed with `_v1_` to allow future schema migration.

**Selectors** (in `selectors.ts` — frozen in Phase 2.5):
- `selectEnrichedRows(state)` — adds drive time, weather, score,
  sorts. Mirrors `App.tsx:286` `rows` memo.
- `selectFilteredRows(state)` — applies reason filter on top.
  Mirrors `App.tsx:308` `filteredRows` memo.
- `selectDisplayWindow(state)` — derives
  `[displayWindowStart, displayWindowEnd]` from `windowHours`,
  `selectedDay`, current hour. Mirrors `App.tsx:277-284`.
- `selectMapPins(state)` — derives `MapPin[]` for the WebView,
  including loading state.
- `selectAnyFailed(state)` — boolean for retry banner visibility.

**`fetchWeather.ts`:** concurrency-pool worker (size 8). Every
fetch tagged with `epoch` from store at issue time; results
written via `setWeatherForDest(id, result, epoch)` which silently
drops if `epoch !== fetchEpoch`. Cancels via `AbortController` on
hub switch. Failed fetches add to `failedIds` instead of throwing.

**`linking.ts`:** parses Expo Linking URLs `dtp://hub/<hubId>?reasons=<csv>`.
Initial state hydration order: deep link > MMKV > default. Writing
back: deep links are read-only on first launch; subsequent state
changes update MMKV only. (No URL-bar writeback on mobile.)

**Validation (commands):**

| Check | Command | Expected |
|---|---|---|
| Typecheck | `cd mobile && npx tsc --noEmit` | exit 0 |
| Store has all 11 slices | `grep -cE "selectedHubId\|windowHours\|tempUnit\|selectedReasons\|selectedDay\|weatherByDest\|loading\|failedIds\|retrying\|detailId\|selectedId\|fetchEpoch" mobile/src/store/index.ts` | ≥ 12 |
| All five selectors exported | `grep -cE "export (function\|const) (selectEnrichedRows\|selectFilteredRows\|selectDisplayWindow\|selectMapPins\|selectAnyFailed)" mobile/src/store/selectors.ts` | = 5 |
| Race protection in setWeatherForDest | `grep -A 5 "setWeatherForDest" mobile/src/store/index.ts \| grep "fetchEpoch"` | matches |
| MMKV adapter + skipHydration | `grep -E "skipHydration\|MMKV" mobile/src/store/persist.ts` | both present |
| Smoke test 1 | `cd mobile && npm test -- store-race.smoke.test` | exit 0 — fires fetch for hub A, switches to hub B, asserts hub-A results dropped |
| Smoke 1 content | `grep -E "fetchEpoch.*expect\|setHub\|hubId" mobile/__tests__/store-race.smoke.test.ts` | ≥ 3 matches |
| Smoke test 2 | `cd mobile && npm test -- store-derived.smoke.test` | exit 0 — feeds fixture hub data + fixture weather, asserts `selectFilteredRows` matches a snapshot derived from the web `App.tsx` logic |
| Smoke 2 content | `grep -E "selectFilteredRows.*expect\|selectEnrichedRows\|selectDisplayWindow" mobile/__tests__/store-derived.smoke.test.ts` | ≥ 2 matches |
| Smoke test 3 | `cd mobile && npm test -- linking.smoke.test` | exit 0 — parses `dtp://hub/seattle?reasons=hike,lake` correctly |
| Smoke 3 content | `grep -E "dtp://hub.*reasons.*expect" mobile/__tests__/linking.smoke.test.ts` | ≥ 1 match |

---

### Phase 2.5 — Shared primitives lock (NEW)

**Agent:** `general-purpose`, sonnet, single agent.

This phase exists because Phase 3 forks five agents in parallel,
all of which depend on shared types. Without explicit lock-down,
they will drift in incompatible directions.

**Scope:**

- **Theme tokens** (`mobile/src/theme/`):
  - `colors.ts` — palette extracted from web Tailwind config (and
    weather-color mappings used in current `Map.tsx` lines 18–20).
    Frozen as a `const` map. No new colors may be introduced in
    Phase 3.
  - `spacing.ts` — 4px grid scale.
  - `typography.ts` — sizes, weights, line heights.
- **Reason icons** (`mobile/src/icons/reason-icon.tsx`):
  - Single `<ReasonIcon reason={...} size={...} />` component.
    Wraps `WaterfallIcon` / `MuseumIcon` / emoji fallbacks. Phase 3
    components import this — they do not implement their own icon
    rendering.
- **Bridge types** — `mobile/src/map/bridge-protocol.ts` is frozen
  as a contract. Phase 3 may not modify; if a component needs a new
  message, it must escalate.
- **Selector API** — `mobile/src/store/selectors.ts` is frozen as
  a contract. Phase 3 imports selectors; new selectors require
  Phase 2.5 update.
- **Add a freeze marker** at the top of each frozen file:
  ```
  // FROZEN as of Phase 2.5 — modifications require a Phase 2.5 amendment.
  ```

**Validation:**

| Check | Command | Expected |
|---|---|---|
| Theme files exist | `ls mobile/src/theme/{colors,spacing,typography}.ts` | all 3 |
| ReasonIcon exported | `grep -n "export.*ReasonIcon" mobile/src/icons/reason-icon.tsx` | 1 match |
| Freeze markers in place | `grep -l "FROZEN as of Phase 2.5" mobile/src/theme/*.ts mobile/src/icons/reason-icon.tsx mobile/src/map/bridge-protocol.ts mobile/src/store/selectors.ts \| wc -l` | = 6 |
| Typecheck | `cd mobile && npx tsc --noEmit` | exit 0 |

---

### Phase 3 — Native UI components (PARALLEL ×5)

**Agents:** five concurrent developer agents, sonnet. Each owns one
component subtree. Hard rule: no agent may modify any frozen file
from Phase 2.5.

| Agent | Component(s) | Reads from store | Reference (web) |
|---|---|---|---|
| 3a | `DayChips`, `HourRangeSlider`, `WhenPicker` | `selectedDay`, `windowHours`, `selectDisplayWindow` | `src/components/DayChips.tsx`, `HourRangeSlider.tsx`, `WhenPicker.tsx` |
| 3b | `ReasonFilter`, `SettingsMenu` | `selectedReasons`, `tempUnit` | `src/components/ReasonFilter.tsx`, `SettingsMenu.tsx` |
| 3c | `DestinationList` (FlatList) | `selectFilteredRows`, `selectedId`, `loading` | `src/components/SideList.tsx` (drop hover popover) |
| 3d | `BottomCardStrip` | `selectFilteredRows`, `selectedId` | `src/components/BottomCardStrip.tsx` |
| 3e | `MobileDetailSheet`, `HubPicker`, `RetryBanner` | `detailId`, `selectedHubId`, `selectAnyFailed` | `src/components/MobileDetailSheet.tsx` + new for HubPicker/RetryBanner |

**Common rules:**
- Read original web component (cited reference) for behavior.
- Do not port Tailwind classes verbatim. Use `theme/` tokens +
  `StyleSheet`.
- Drop desktop UX (hover, mousedown outside-click, keyboard shortcuts).
- Use `Pressable` with `accessibilityRole`/`accessibilityLabel` —
  required for App Store accessibility.
- Cap font scaling at 1.3× via `allowFontScaling={true}` +
  `maxFontSizeMultiplier={1.3}`.
- Read store via narrow selectors only. Do not duplicate state.
- Forbidden: modifying `theme/`, `store/selectors.ts`,
  `map/bridge-protocol.ts`, `icons/`.

**Validation per component (commands):**

| Check | Command | Expected |
|---|---|---|
| Typecheck | `cd mobile && npx tsc --noEmit` | exit 0 |
| No DOM APIs | `grep -rEn "document\.\|window\.\|getBoundingClientRect\|scrollIntoView\|MutationObserver\|addEventListener" mobile/src/components/<NAME>.tsx` | no matches |
| Uses theme tokens | `grep -nE "from '[../]+theme'\|from '@/theme'" mobile/src/components/<NAME>.tsx` | ≥ 1 |
| Has accessibilityLabel on every Pressable | `grep -c "accessibilityLabel=" mobile/src/components/<NAME>.tsx` ≥ count of `<Pressable` | true |
| Frozen files unchanged | `git diff --stat mobile/src/{theme,icons,map/bridge-protocol.ts,store/selectors.ts}` | empty |
| Smoke test | `cd mobile && npm test -- <NAME>.smoke.test` | exit 0 — renders with fixture state, asserts visible text/labels |

A merge-conflict validator runs after all 5 agents complete:
`git merge-tree HEAD <branch3a> <branch3b>` for each pair. Any
non-trivial overlap → FAIL → escalate.

---

### Phase 4 — Integration (iPhone + Android phone)

**Agent:** `general-purpose`, sonnet, single agent.

**Scope:**
- `MainScreenPhone.tsx`: layout the map (top half) + bottom strip
  + sheet + retry banner + header (HubPicker, WhenPicker,
  ReasonFilter, SettingsMenu). Single-column phone layout.
- App shell: `SafeAreaView`, status bar, keyboard avoidance,
  gesture handler root.
- Hub switch flow: bump `fetchEpoch`, clear weather, send `INIT`
  to map, kick off fetch worker.
- Day switch: re-derive `displayWindow`, re-compute
  `selectMapPins`, send fresh `SET_PINS`.
- Pin tap: store sets `selectedId` and `detailId`; map flies; sheet
  opens.
- List/card tap: same.
- Sheet swipe-down or backdrop tap: clears `detailId`.
- AppState handler: on `active` after background, send `HEARTBEAT`;
  no ACK in 1.5s → `forceReload` + re-handshake.
- Deep link entry: `linking.ts` parses URL → store hydration.
- RetryBanner: shows when `selectAnyFailed`. Tap → `retryFailed`.
- **TileFallbackBanner**: small inline banner shown when the map
  WebView has reported `TILE_ERROR` AND `NetInfo` reports offline.
  Copy: "Connect to load map graphics — pins and forecasts work
  offline." Auto-hides when connectivity returns and tiles render.
  ~5 lines + one bridge `TILE_ERROR` listener.
- Root `App.tsx` chooses screen at runtime via
  `Platform.isPad || (Platform.OS === 'ios' && minDim >= 768)` →
  renders `MainScreenIPad` (Phase 4b output) on iPad, else
  `MainScreenPhone`.

**Validation:**

| Check | Command | Expected |
|---|---|---|
| Typecheck | `cd mobile && npx tsc --noEmit` | exit 0 |
| Export | `cd mobile && npx expo export` | exit 0 |
| Bundle size | `du -sh mobile/dist` | < 20 MB |
| Frozen files unchanged | `git diff --stat ...frozen paths...` | empty |
| Cross-phase regression | `npm test --workspaces` | all phase smoke tests still pass |
| Flow walk smoke | `cd mobile && npm test -- integration.smoke.test` | exit 0 — asserts each user flow has a code path with named symbols (hub-switch → setHub → fetch start → bridge SET_PINS) |

---

### Phase 4b — Integration (iPad-optimized layout)

**Agent:** `general-purpose`, sonnet, single agent. Runs in
parallel with Phase 4.

iPad gets a real tablet layout, not a stretched-iPhone phone-compat
build. The component primitives from Phase 3 are reused; only the
shell layout and detail-presentation pattern differ.

**Scope:**
- `MainScreenIPad.tsx`: two-pane layout.
  - Header: full-width strip with `HubPicker`, `WhenPicker`,
    `ReasonFilter` (more chips visible than phone), `SettingsMenu`.
  - Left pane (~360pt fixed width on landscape, ~320pt on portrait):
    `DestinationList` (FlatList) — always visible, no bottom strip.
  - Right pane: `MapWebView` — fills remaining space.
  - No `BottomCardStrip` (the list is always visible, so the strip
    is redundant).
- **Detail presentation:** `IPadDetailPanel.tsx` — slides in from
  right edge over the map (~360pt wide), not a bottom modal. Same
  store driver (`detailId`), same content as `MobileDetailSheet`,
  different shell. Backdrop tap or swipe-right closes.
- **Orientation handling:** layout responds to `useWindowDimensions`.
  Portrait keeps two-pane (narrower list); rotation transitions
  smoothly without remounting state.
- **Slide Over / Split View:** standard iPad multitasking — handled
  via the same `useWindowDimensions` listener. When width drops
  below 600pt (e.g. user puts the app in narrow Slide Over), fall
  back to `MainScreenPhone`. Above 600pt, two-pane layout.
- **Pointer support:** native to React Native — `Pressable`
  receives pointer-hover state on iPad with Magic Keyboard /
  trackpad. Use it to surface a subtle hover preview on rows
  (highlight + drop shadow) without blocking touch UX. No popovers
  on hover (would conflict with tap behavior).
- **Hardware keyboard:** out of scope v1 (no shortcuts wired). The
  existing keyboard avoidance still works.
- **Multi-window scenes (UISceneSession):** out of scope v1.
  Requires AppDelegate changes; ships in v2 if user demand exists.

**What this phase MUST NOT do:**
- Modify any frozen file (theme, icons, bridge, selectors).
- Modify `MainScreenPhone.tsx` (Phase 4 output).
- Modify any Phase 3 component (those are reused as-is).
- Touch the store schema (must work with the same DTPState).

**Validation:**

| Check | Command | Expected |
|---|---|---|
| Typecheck | `cd mobile && npx tsc --noEmit` | exit 0 |
| Frozen files unchanged | `bash mobile/scripts/check-frozen.sh` | exit 0 |
| Phase 3 components unchanged | `git diff --stat mobile/src/components/{DayChips,WhenPicker,HourRangeSlider,ReasonFilter,SettingsMenu,DestinationList,BottomCardStrip,MobileDetailSheet,HubPicker,RetryBanner}.tsx` | empty |
| MainScreenPhone unchanged | `git diff --stat mobile/src/screens/MainScreenPhone.tsx` | empty |
| iPad screen exists | `test -f mobile/src/screens/MainScreenIPad.tsx && test -f mobile/src/components/IPadDetailPanel.tsx` | both exist |
| Layout switch wired | `grep -E "Platform.isPad\|isTablet\|MainScreenIPad" mobile/App.tsx` | ≥ 1 match |
| Two-pane structure | `grep -cE "flexDirection.*row\|width:.*36[0-9]" mobile/src/screens/MainScreenIPad.tsx` | ≥ 2 |
| Slide Over fallback | `grep -E "useWindowDimensions\|width.*<.*600" mobile/src/screens/MainScreenIPad.tsx` | both present |
| Smoke test | `cd mobile && npm test -- ipad-layout.smoke.test` | exit 0 — feeds 1024×768 dimensions, asserts two-pane render; feeds 480×768, asserts phone fallback render |
| Smoke content check | `grep -E "MainScreenIPad.*expect\|two-pane\|phone fallback" mobile/__tests__/ipad-layout.smoke.test.ts` | ≥ 2 matches |

**Reviewer focus (Phase 4b):**
- `useWindowDimensions` re-render correctness (no stale layouts on rotation).
- IPadDetailPanel doesn't block map gestures when open (z-index, pointer-events).
- Phone fallback below 600pt actually renders without crashes.
- Pointer hover state doesn't accidentally fire on touch-only iPads.

---

### Phase 5 — Device validation (human-touched)

The one phase that genuinely requires human involvement.

**Phase 5.0 — Bundle ID swap (agent-driven, before device build):**

If the user has registered `rajatsinghal.dev`, swap the development
bundle ID `io.github.rajatsinghal.daytripplanner` to the launch
bundle ID `dev.rajatsinghal.daytripplanner` before any TestFlight
upload. If the domain is not yet registered, skip this step and run
Phase 5 with the dev bundle ID; swap later before TestFlight.

Agent steps:
1. Edit `mobile/app.json`: `ios.bundleIdentifier` and
   `android.package` set to `dev.rajatsinghal.daytripplanner`.
   URL scheme stays `dtp`.
2. Run `npx expo prebuild --clean` to regenerate native projects.
3. Re-run cross-phase regression (typecheck + smoke tests).
4. Commit the swap with message `Swap to launch bundle ID`.

After this, the user provisions Apple Developer App ID and Google
Play Console entry against the new ID (out-of-band; one-time at
launch).

**Entry gate (must PASS before user touches a device):**

| Check | Command | Expected |
|---|---|---|
| Cross-phase regression | `cd mobile && npx tsc --noEmit && npm test` | exit 0; all phase smoke tests still pass |
| Frozen files unchanged since Phase 2.5 commit | `git diff --stat <phase-2.5-sha>..HEAD -- mobile/src/theme mobile/src/icons/reason-icon.tsx mobile/src/map/bridge-protocol.ts mobile/src/store/selectors.ts` | empty (no diff) |
| App exports cleanly | `cd mobile && npx expo export` | exit 0 |
| Bundle ID is launch ID (if swap done) | `grep -E "dev\\.rajatsinghal\\.daytripplanner\|io\\.github\\.rajatsinghal\\.daytripplanner" mobile/app.json` | one match |

**Scope:**
- User runs `cd mobile && npx expo run:ios` (or EAS Build →
  TestFlight) and `npx expo run:android`.
- User follows test checklist generated by validator agent at
  `mobile/TEST_CHECKLIST.md`.
- FAIL items reported by number; fix agent triages and patches.

**Rollback rule:** every Phase 5 fix re-runs the entry-gate
commands above. If a fix re-breaks any prior-phase smoke test, the
fix is reverted and the failure is escalated rather than papered
over with another fix.

**Checklist categories** (objective outcomes only):

1. Cold launch: app launches in <3s on iPhone 12 / Pixel 6 / iPad
   Air; map shows pins within 10s.
2. Pan/zoom: subjective — note any stutter; capture FPS via
   instrumentation already in map.html (logged via `LOG` message).
3. Pin tap → detail opens (sheet on phone, side panel on iPad);
   list/card tap → map flies + detail opens.
4. Hub switch: pin count on map matches `selectFilteredRows.length`
   for the new hub within 30s of switch.
5. Day switch: pin sprites update visibly within 2s.
6. Filter toggle: list count and map pin count agree.
7. Background → foreground: heartbeat round trip within 1.5s; if
   not, observe map fully reloads and pins reappear.
8. Force-quit → relaunch: persisted state restored (last hub,
   filters, units).
9. Airplane mode → cold launch: app loads with cached hubs; retry
   banner appears; turning network back on + retry succeeds.
10. Memory: 10 hub switches in a row, no crash; Sentry shows zero
    crashes.
11. **iPad layout:** two-pane on iPad Air landscape and portrait.
    Detail opens as right-side panel (not bottom sheet). Rotate
    device — layout reflows without state loss.
12. **iPad Slide Over:** drag the app into Slide Over (narrow
    width). Layout falls back to phone single-column. Drag back to
    full width — two-pane returns.
13. **iPad pointer (if Magic Keyboard available):** hovering a row
    with the cursor highlights it; tapping behaves identically to
    finger.

User touchpoints in Phase 5: build command, report FAIL item
numbers, confirm fixes by re-running specific items.

---

## 7. Agentic cycle

```
           ┌─────────────────┐
           │  DEVELOPER      │
           │  AGENT          │ ──────────┐
           │  implements     │           │
           └─────────────────┘           │
                                         ▼
                                ┌─────────────────┐
                                │  VALIDATOR      │
                                │  AGENT          │
                                │  runs commands, │
                                │  pastes output  │
                                └────────┬────────┘
                                         │
                               PASS ◄────┴────► FAIL
                                │                  │
                                │                  ▼
                                │         ┌─────────────────┐
                                │         │  FIX AGENT      │
                                │         │  reads report + │
                                │         │  FIX_LOG.md;    │
                                │         │  diff ≤ 200 LoC │
                                │         └────────┬────────┘
                                │                  │
                                │                  └──► back to VALIDATOR
                                │
                                ▼
                        ┌─────────────────┐
                        │  REVIEWER AGENT │  (final pass per phase)
                        │  reads diff,    │
                        │  finds runtime- │
                        │  break risks    │
                        └────────┬────────┘
                                 │
                       PASS ◄────┴────► FAIL → back to FIX
                         │
                         ▼
                  advance to next phase
```

**Cycle contracts:**

- **Validator output format:** structured list of
  `{ pass: bool, check: string, command: string, output: string }`.
  Reports without `output` field are rejected; the validator must
  paste actual command transcripts. "Looks good" is not acceptable.
- **Smoke-test content checks:** every phase that requires a
  smoke test ALSO requires a content check on the test file
  (e.g. `grep -E "fetchEpoch.*expect" mobile/__tests__/store-race.smoke.test.ts`)
  to defend against `expect(true).toBe(true)` rubber-stamps. The
  per-phase command tables list the required grep terms.
- **Fix agent constraints:** diff ≤ 200 lines per pass; touches
  only files cited by validator. May read prior `FIX_LOG.md`
  entries to avoid repeating failed fixes.
- **Fix log:** each phase has `mobile/_phase<N>/FIX_LOG.md`. Fix
  agent appends after each pass: pass number, summary, files
  changed, validator result.
- **3-pass cap is global per phase.** It is shared between the
  developer→validator→fix loop and the reviewer→fix loop. Any
  combination of fix passes above 3 escalates. Reviewer-triggered
  fixes are not bonus passes.
- **Reviewer fan-out:** after validator PASS, four reviewers run
  in parallel. Each looks at the diff from a different angle. Their
  findings merge into a single fix-spec list before any fix is
  applied. Charged against the global 3-pass budget.

  | Reviewer | Model | Focus |
  |---|---|---|
  | Runtime risk | opus | Races, useEffect deps, FlatList keyExtractor, malformed bridge JSON, AppState empty-store reads, MMKV first-render hydration, postMessage > 64 KB |
  | Security | opus | Deep link injection (validate hub IDs against known list, reject malformed `?reasons=`), postMessage payload validation in WebView handler, MMKV unencrypted sensitive data check (none expected, but verify), WebView `originWhitelist` correctness, `injectJavaScript` payload sanitization |
  | Accessibility | sonnet | `accessibilityLabel` + `accessibilityRole` on every Pressable, color-contrast pairs against WCAG AA, hit target ≥ 44pt, font-scaling cap honored, screen-reader-only sibling list for the map (since map pins are not accessible to VoiceOver/TalkBack) |
  | Performance | sonnet | React re-render patterns (selectors used with `useShallow`), `useMemo` dep arrays, `FlatList` `getItemLayout` for known heights, image asset sizes, bundle size delta vs prior phase, no inline anonymous handlers passed to memoized children |
- **Frozen-file enforcement:** every Phase 3 / 4 / 4b validator runs
  `git diff --stat` against the frozen paths (theme, icons,
  bridge-protocol, selectors). Any change to a frozen path makes that
  phase's validator FAIL, which triggers the fix loop. The freeze
  marker (`// FROZEN as of Phase 2.5`) is the contract that agents
  read in their prompts; the validator is the enforcement. No git
  hook is used — repo-wide hook config adds friction for legitimate
  workflow and is bypassable with `--no-verify` anyway.
- **Cross-phase regression:** every phase's validator re-runs the
  prior phases' command-based checks (typecheck and smoke tests).
  If any prior phase regresses, current phase FAILS.
- **Escalation payload:** at 3-pass cap, fix agent produces:
  failing check IDs, what was tried each pass, hypothesis, specific
  human input requested.

**Parallelism rules:**

- Phases 0 → 1 → 2 → 2.5 → 3 → (4 ∥ 4b) → 5 sequential except where noted.
- Phase 3 is parallel ×5 across components, gated on Phase 2.5
  freeze. Post-merge conflict validator must PASS before Phase 4
  / 4b.
- Phases 4 (iPhone) and 4b (iPad) run in parallel. Both depend on
  Phase 3 PASS; neither blocks the other. Both must PASS before
  Phase 5.
- Within a phase, dev → validator → fix is sequential; no skipping.

---

## 8. Web-to-native API mapping

Used by all Phase 3 component agents.

| Web pattern | Native replacement |
|---|---|
| `<div>` | `<View>` |
| `<button>` | `<Pressable>` (with `pressed` state styles) |
| `<a href>` | `<Pressable onPress={() => Linking.openURL(...)}>` |
| `<ul>` / `<li>` | `<FlatList>` (>10 items) or `<ScrollView>` |
| `<img src>` | `<Image source={require(...)}>` |
| `<svg>` + children | `<Svg>` from `react-native-svg` |
| `<select>` | Custom `Picker` sheet or `@react-native-picker/picker` |
| `<input type="range">` | `@miblanchard/react-native-slider` (multi-thumb) |
| Tailwind classes | `theme/` tokens + `StyleSheet` |
| `onClick` | `onPress` |
| `onMouseEnter` / `onMouseLeave` | **dropped** |
| `hover:` styles | **dropped** |
| `document.addEventListener('keydown')` | **dropped** |
| `document.addEventListener('mousedown')` (outside-click) | `<Modal>` or transparent `Pressable` backdrop |
| `el.scrollIntoView(...)` | `flatListRef.current.scrollToIndex(...)` |
| `el.getBoundingClientRect()` | `Dimensions.get('window')` + `onLayout` |
| `localStorage` | MMKV (sync) — set up Phase 0 |
| CSS `transition` / `animation` | `Animated` or `Reanimated` |
| `position: fixed` | `<Modal>` or absolute inside `SafeAreaView` |
| `window.location.search` | Expo Linking + `linking.ts` parser |
| `setTimeout` | `setTimeout` (same) |

---

## 9. Risks and fallbacks

| Risk | Likelihood | Mitigation |
|---|---|---|
| WebView blank after backgrounding | High | Heartbeat + reload on no-ACK; `onContentProcessDidTerminate` and `onRenderProcessGone` handlers (§4.5) |
| WebGL context loss on older iOS | Medium | `webglcontextlost` handler in map.html → `MAP_ERROR` → reload (§4.5) |
| Stale `SET_PINS` corrupting display | Medium | `seq` numbers + `fetchEpoch` (§4.2 + §6 Phase 2 race protection) |
| Tile loading over HTTPS from `file://` page on Android | Medium | `mixedContentMode="always"` + HTTPS `baseUrl` (§6 Phase 1) |
| Local sibling JS load fails on iOS | High if not addressed | Single inlined HTML, no sibling files (§6 Phase 1) |
| MapLibre bundle inflates app size | Medium | Inline at build, gzip target ≤ 1.2 MB |
| NWS rate limits on rapid hub switching | Medium | Concurrency cap 8 + epoch invalidation |
| iOS App Store 4.2 rejection | Low | Native UI; only map is WebView; native pickers and share |
| Android WebView variance | Medium | Target Chrome 90+; test 2 devices in Phase 5 |
| Expo SDK 52 + WebView injectJavaScript timing | Medium | Map-first handshake + outbox queue (§4.1) |
| MMKV native build friction | Low | Standard Expo dev-client flow; well-documented |

**Escape hatches:**
- WebView map perf unacceptable on target devices: swap to
  `@maplibre/maplibre-react-native`. Bridge types and store are
  wrapper-agnostic; only `MapWebView.tsx` rewrites. Phase 1 only.
- MMKV crashes in EAS Build: fallback to AsyncStorage + sync
  hydration boundary (App.tsx loading screen).

---

## 10. Minimum human engagement

Phases 0 → 1 → 2 → 2.5 → 3 → 4 ∥ 4b run **autonomously**. No
per-phase sign-off. Each phase's PASS reports and fix logs are
committed so they can be audited retrospectively, but the next
phase dispatches automatically once the prior phase passes.

You engage only at:

1. **Phase 4b PASS** — ready for Phase 5. I notify you with a
   summary; you build and run the device checklist.
2. **3-pass cap exhausted** — true blocker on any phase. I surface
   the escalation payload (failing checks, attempts, hypothesis,
   specific input requested). You decide.
3. **Out-of-band actions** — anything I can't do myself: providing
   the GitHub username for bundle ID, registering the domain,
   provisioning Apple/Google credentials at launch, generating
   final app assets via your image-gen tool when prompted.

Everything else is agent-owned, including:
- Validator and reviewer fan-out per phase.
- Fix loops within each phase.
- Inter-phase dispatching.
- Cross-phase regression checking.
- Commit messages summarizing each phase outcome.

---

## 11. Launch criteria

Ship to TestFlight (iOS) and Play Console internal testing (Android) when:

- All of Phases 0–4 and Phase 4b PASS their validators and reviewer
  agents.
- Phase 5 checklist items 1–13 PASS on:
  - one iPhone (≥ iPhone 12, iOS ≥ 17)
  - one iPad (≥ iPad Air 4th gen, iPadOS ≥ 17)
  - one Android phone (Pixel 5+ or equivalent, Android ≥ 12)
- Bundle size < 40 MB installed.
- Cold launch < 3s on the above devices.
- Sentry crash-free session rate > 99% in the first 24h of internal
  TestFlight use (measurement requires Phase 0 Sentry install).

---

## 12. v1 scope decisions

These are explicit decisions, not aspirations. Agents do not
re-litigate.

| Concern | v1 decision | Rationale |
|---|---|---|
| Bundle ID (development) | `io.github.rajatsinghal.daytripplanner` | Free GitHub-namespaced ID; ships with all Phase 0–4b builds |
| Bundle ID (launch) | `dev.rajatsinghal.daytripplanner` | Final ID after `rajatsinghal.dev` is registered. Pre-launch swap stage in Phase 5 entry. iOS package + Android package + URL scheme stays `dtp` |
| Bundle ID swap timing | Before first TestFlight upload (Phase 5 entry) | Bundle ID is locked once published; swap before any App Store record exists is trivial |
| App icon + splash | Generated via `~/Code/tut-ai/dev-tools` image-gen script; placeholders during Phase 0–4b; real assets generated when Phase 5 launches | Tool exists locally; final assets need actual layouts to match |
| Privacy policy | Hosted on GitHub repo (markdown) or domain landing page; URL provided during App Store submission | Apple requires a publicly accessible privacy policy URL per app |
| iPad | Tablet-optimized two-pane layout (Phase 4b). Side detail panel, not bottom sheet. Slide Over falls back to phone layout below 600pt width. Pointer support. | iPad usage warrants a real layout; component primitives are reused so the cost is one shell phase running in parallel with Phase 4 |
| iPad multi-window scenes (UISceneSession) | Out of scope v1 | Requires AppDelegate work; can be added in v2 if user demand exists |
| iPad hardware-keyboard shortcuts | Out of scope v1 | Nice to have, not load-bearing; v2 polish |
| Android tablet | Phone-compat in v1 | Lower iPad-equivalent installed base; revisit post-launch |
| `requireFullScreen` | `false` (default) — app supports multitasking | Required for proper Slide Over / Split View on iPad |
| Push notifications | Out of scope | App has no backend; would require APNS/FCM credentials, opt-in flow, scheduling service. No use case identified for v1. |
| Location permission ("near me") | Out of scope v1 | Hub picker is the entry point and works without permission friction; drive times anchored to hub center are acceptable for v1. Adds a permission prompt and edge cases (rural users far from any hub) that aren't worth v1 complexity. |
| Tile pre-cache for offline | Out of scope | OpenFreeMap tiles cached opportunistically by WebView during normal use, but no proactive download. True offline-first map requires meaningful storage budget and a UX for managing it. Weather data IS cached (MMKV); only map graphics are network-dependent on cold launch. |
| No-tiles fallback UI | `TileFallbackBanner` shown when WebView reports `TILE_ERROR` AND `NetInfo` reports offline. Wired in Phase 4 / 4b. | Mitigates the worst tile-deferral UX (silent blank gray map) without the engineering cost of a real pre-cache; ~5 lines |
| Offline cold-launch UX | Banner: "No network — last known forecasts." Cached weather + cached hubs render | NWS data is forecast-only; a 6-hour-old forecast is still useful |
| Deep linking | `dtp://hub/<id>?reasons=<csv>`. Read-only on launch | Mirrors web `?hub=` and `?reasons=` URL params |
| Dark mode | Honored by `SET_STYLE` to map; native UI follows system theme | Cheap; both MapLibre styles already exist |
| Accessibility | Required: `accessibilityLabel`/`accessibilityRole` on all Pressables; font scaling capped at 1.3×; map pin tap area ≥ 44pt | App Store guideline 1.5; floor not ceiling |
| RTL | Not required v1 (English-only content) | hub data is English; full RTL is v2 if internationalized |
| Crash reporting | Sentry installed Phase 0; DSN env var; symbol upload via EAS hook | Required for §11 launch criterion |
| EAS credentials | Documented in eas.json; provisioning deferred to launch (one-time human task) | Apple Developer + Play Console accounts are user-supplied |

---

## Appendix A — Agent task templates

Each prompt is self-contained — embeds the contracts the agent
needs without requiring the agent to read the whole plan.

### Phase 0 scaffold agent

```
Set up an npm workspaces monorepo at /Users/rajatsinghal/Code/day-trip-planner.
Follow MOBILE_PLAN.md §6 Phase 0 exactly.

Steps:
 1. Create packages/core/ as a workspace package.
 2. Move src/lib/{weather,geo,days,units}.ts and src/hubs/* into
    packages/core/src/. Update web src/ imports to @dtp/core.
 3. Init Expo SDK 52+ at mobile/. Strict TypeScript.
 4. Install: react-native-webview, react-native-mmkv, zustand,
    react-native-svg, react-native-gesture-handler,
    react-native-reanimated, @expo/vector-icons,
    @sentry/react-native, expo-linking, expo-application.
 5. app.json:
      - `ios.bundleIdentifier`: `io.github.rajatsinghal.daytripplanner`
      - `android.package`: `io.github.rajatsinghal.daytripplanner`
      - `scheme`: `dtp`
      - `supportsTablet: true`, `requireFullScreen: false` (for
        Slide Over / Split View on iPad), iPad orientations
        (portrait + landscape).
      - Splash, icon: placeholders fine for now.
 6. eas.json: development, preview, production profiles.
 7. Sentry init in App.tsx (placeholder DSN env var).
 8. Port nws.ts → MMKV. Port reasons_to_visit SVG icons → react-native-svg.
 9. expo prebuild.

Run validator commands listed in §6 Phase 0 yourself before
reporting done. Paste full command output for each in your report.
Do not say "looks good" — paste transcripts.
```

### Phase 1 map WebView agent

```
Implement the map WebView per MOBILE_PLAN.md §6 Phase 1 and §4.

Required reading: §4 (full bridge protocol) and §6 Phase 1.

Frozen contracts you must conform to:
 - Bridge types: types from §4.3 and §4.4 are the contract.
   Define them in mobile/src/map/bridge-protocol.ts. Do not invent
   new message types.
 - Handshake order: map posts MAP_READY first; native sends INIT
   after; map posts MAP_INITIALIZED; native flushes outbox.
 - All native→map messages carry monotonic seq. Map drops
   messages with stale seq for that type.

Implementation rules:
 - Single self-contained mobile/assets/map.html. MapLibre GL JS
   inlined at build time via mobile/scripts/build-map-html.ts.
   No sibling JS files.
 - Pins as GeoJSON symbol layer with icon-image pointing to a
   sprite sheet built by mobile/scripts/build-sprites.ts. NO
   text-field with emoji. NO maplibregl.Marker for pins.
 - Home pin (🏠 + center.name) IS allowed to use maplibregl.Marker
   (single non-perf-critical element).
 - WebView source: { html: inlinedHtml, baseUrl: 'https://localhost' }.
 - WebView props: mixedContentMode="always", originWhitelist=['*'],
   allowFileAccessFromFileURLs, allowUniversalAccessFromFileURLs.
 - Recovery: webglcontextlost in HTML, onContentProcessDidTerminate
   (iOS), onRenderProcessGone (Android), heartbeat with 1500ms
   timeout. On any failure: webViewRef.reload(), then re-handshake,
   then re-INIT, then re-SET_PINS, then re-SET_SELECTED.

Style URL: https://tiles.openfreemap.org/styles/positron (light)
or .../dark-matter (dark) — same as the web app uses.

Weather code → sprite mapping: read packages/core/src/weather.ts
function `weatherCodeToColor` (or equivalent) and src/lib/weather.ts
constants `LOADING_BG` `WEATHER_COLORS`. Mirror exactly.

Run validator commands from §6 Phase 1 before reporting done. Paste
full transcripts.
```

### Phase 2 state agent

```
Implement the Zustand store per MOBILE_PLAN.md §6 Phase 2.

State shape MUST exactly match §6 Phase 2's interface DTPState
(11 slices including loading, failedIds, retrying, detailId,
selectedId, fetchEpoch). Reference web App.tsx:75-95 for behavior.

Race protection: setWeatherForDest takes (id, result, epoch).
If epoch !== state.fetchEpoch, drop. setHub bumps fetchEpoch.

Selectors (in selectors.ts): selectEnrichedRows,
selectFilteredRows, selectDisplayWindow, selectMapPins,
selectAnyFailed. Mirror web App.tsx memo logic exactly:
 - selectEnrichedRows ↔ App.tsx `rows` memo (line ~286)
 - selectFilteredRows ↔ App.tsx `filteredRows` memo (line ~308)
 - selectDisplayWindow ↔ App.tsx lines 277-284 clamp logic.

MMKV via custom Zustand storage adapter. skipHydration: true,
gate first paint via useHydration().

linking.ts parses dtp://hub/<id>?reasons=<csv>. Hydration order:
deep link > MMKV > default.

Smoke tests required:
 1. store-race.smoke.test — fires fetch for hub A, switches to B,
    asserts hub-A results dropped via fetchEpoch.
 2. store-derived.smoke.test — feeds fixture, asserts
    selectFilteredRows matches web logic.
 3. linking.smoke.test — dtp://hub/seattle?reasons=hike,lake parses.

Run validator commands from §6 Phase 2 before reporting done. Paste
full transcripts.
```

### Phase 2.5 primitives lock agent

```
Lock down shared primitives per MOBILE_PLAN.md §6 Phase 2.5.
Frozen files: mobile/src/theme/{colors,spacing,typography}.ts,
mobile/src/icons/reason-icon.tsx, mobile/src/map/bridge-protocol.ts,
mobile/src/store/selectors.ts.

Each frozen file gets a top comment:
  // FROZEN as of Phase 2.5 — modifications require a Phase 2.5 amendment.

Theme palette: extract from tailwind.config.js + Map.tsx weather
color map (lines 18-20 of src/components/Map.tsx).

Validator commands from §6 Phase 2.5. Paste transcripts.
```

### Phase 3 component agent (template, parameterized per agent)

```
Port the web component(s) at <CITED PATHS> to React Native at
mobile/src/components/<NEW NAMES>. Follow MOBILE_PLAN.md §6 Phase 3
and §8.

You may NOT modify any of these frozen files:
 - mobile/src/theme/*
 - mobile/src/icons/reason-icon.tsx
 - mobile/src/map/bridge-protocol.ts
 - mobile/src/store/selectors.ts

Store interface (read these slices/selectors only):
<EMBED SLICE/SELECTOR LIST FOR THIS AGENT>

Theme tokens you can use:
<EMBED TOKEN LIST>

Rules:
 - StyleSheet only. No inline styles unless dynamic.
 - Pressable + accessibilityLabel + accessibilityRole on every tap target.
 - maxFontSizeMultiplier={1.3} on all Text.
 - Drop hover, mousedown outside-click, keyboard shortcuts.
 - Smoke test required per component: renders with fixture state,
   asserts visible text/labels.

Validator commands from §6 Phase 3 before reporting. Paste
transcripts. Confirm git diff --stat shows no changes to frozen
files.
```

### Phase 4b iPad agent

```
Implement iPad-optimized layout per MOBILE_PLAN.md §6 Phase 4b.
Runs in parallel with Phase 4.

You may NOT modify:
 - Any frozen file (theme, icons, bridge-protocol, selectors).
 - Any Phase 3 component (mobile/src/components/{DayChips,
   WhenPicker, HourRangeSlider, ReasonFilter, SettingsMenu,
   DestinationList, BottomCardStrip, MobileDetailSheet, HubPicker,
   RetryBanner}.tsx).
 - mobile/src/screens/MainScreenPhone.tsx (Phase 4 owns it).
 - The store schema or selectors.

Create:
 - mobile/src/screens/MainScreenIPad.tsx — two-pane layout
   (header strip + DestinationList left + MapWebView right).
 - mobile/src/components/IPadDetailPanel.tsx — slide-in side panel
   driven by the same `detailId` store slice as MobileDetailSheet,
   ~360pt wide, sliding from right edge over the map.

Modify (Phase 4 may also touch this — coordinate via merge after
both phases PASS):
 - mobile/App.tsx — runtime layout switch:
   import { Platform, useWindowDimensions } from 'react-native';
   const { width } = useWindowDimensions();
   const isIPad = Platform.OS === 'ios' && Platform.isPad;
   const isWide = width >= 600;
   const Screen = (isIPad && isWide) ? MainScreenIPad : MainScreenPhone;

Behavior rules:
 - Layout reflows on rotation via useWindowDimensions, no remount.
 - Below 600pt width (Slide Over), fall back to MainScreenPhone.
 - Pointer hover (Pressable's pressed/hovered states) shows a
   subtle row highlight on iPad. No popovers on hover.
 - IPadDetailPanel does not block map gestures when open
   (z-index, pointer-events on backdrop only when interactive).

Run validator commands from §6 Phase 4b before reporting. Paste
transcripts. Confirm git diff --stat shows no changes to forbidden
files.
```

### Validator agent (general)

```
Validate MOBILE_PLAN.md §6 Phase <N> for the most recent dev-agent
output. For EACH check in that phase's command table:
 1. Run the exact command listed.
 2. Paste the full command output.
 3. Mark pass/fail based on the "Expected" column.

Output format per check:
  { pass: bool, check: "<name>", command: "<exact cmd>",
    output: "<full transcript>", expected: "<from table>" }

Return the full list — do not short-circuit on first fail.
Reports without command output are invalid; you must run commands.
Do not fix anything. Your job is to report.
```

### Fix agent (general)

```
Read the validator report at <path> and the dev-agent's diffs.
Read mobile/_phase<N>/FIX_LOG.md (may be empty on pass 1).

For each FAIL check:
 1. Identify root cause from the cited file/line.
 2. Make the smallest patch that satisfies the check.
 3. Total diff this pass MUST be ≤ 200 lines (`git diff --stat`).
 4. Touch ONLY files cited in the validator report.

After patching:
 1. Re-run the validator commands yourself, paste transcripts.
 2. Append to FIX_LOG.md: pass number, summary, files changed,
    re-validation result.

If you cannot make all checks pass within 200 lines, escalate:
emit a final FIX_LOG entry with failing check IDs, attempts so far,
and specific human input you need.
```

### Reviewer agent (per phase)

```
You are a final reviewer. Validator already PASSed. Your job is to
find runtime-break risks the validator can't catch.

Read the diff for Phase <N> and look specifically for:
 - useEffect missing deps that cause stale closures
 - FlatList without keyExtractor or with non-unique keys
 - forwardRef typed but imperative methods never invoked
 - AppState listeners with empty store reads
 - Bridge messages thrown on malformed JSON
 - Race conditions between setHub and in-flight fetches
 - MMKV reads on first render before hydration
 - postMessage payloads exceeding 64KB

If you find any: produce a fix-spec list (file:line, problem,
suggested fix) and route back to fix agent. Otherwise PASS.
```
