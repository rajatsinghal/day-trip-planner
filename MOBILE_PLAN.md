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

**v1 platform scope:** iPhone + Android phone. iPad ships as
phone-compat in v1 (declared `requireFullScreen`); proper iPad layout
is v2. See §12.

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
  selected: boolean;
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
   `.reload()` and re-handshakes.
3. **AppState `active` post-resume**: native sends `HEARTBEAT`. If
   no `HEARTBEAT_ACK` within 1500ms, treat as dead → `.reload()` +
   re-handshake. If ACK arrives, just refresh pins (cheap path).

After any reload, native resends in order: `INIT` → `SET_PINS`
(current hub) → `SET_SELECTED` (current selection).

### 4.6 Transport

- **Native → Map:**
  `webViewRef.current.injectJavaScript('window.handleNativeMessage(' + JSON.stringify(msg) + ');true;')`.
  Trailing `true;` is required to avoid an iOS WKWebView bug
  returning non-string. Outbox flushes one message per
  `requestAnimationFrame` to avoid bursty drops.
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
| Smoke test 2 | `cd mobile && npm test -- store-derived.smoke.test` | exit 0 — feeds fixture hub data + fixture weather, asserts `selectFilteredRows` matches a snapshot derived from the web `App.tsx` logic |
| Smoke test 3 | `cd mobile && npm test -- linking.smoke.test` | exit 0 — parses `dtp://hub/seattle?reasons=hike,lake` correctly |

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
| Freeze markers in place | `grep -l "FROZEN as of Phase 2.5" mobile/src/{theme,map,store,icons}/*.ts` | ≥ 6 files |
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

### Phase 4 — Integration

**Agent:** `general-purpose`, sonnet, single agent.

**Scope:**
- `MainScreen.tsx`: layout the map (top half) + bottom strip + sheet
  + retry banner + header (HubPicker, WhenPicker, ReasonFilter,
  SettingsMenu). Single-column phone layout.
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

### Phase 5 — Device validation (human-touched)

The one phase that genuinely requires human involvement.

**Scope:**
- User runs `cd mobile && npx expo run:ios` (or EAS Build →
  TestFlight) and `npx expo run:android`.
- User follows test checklist generated by validator agent at
  `mobile/TEST_CHECKLIST.md`.
- FAIL items reported by number; fix agent triages and patches.

**Checklist categories** (objective outcomes only):

1. Cold launch: app launches in <3s on iPhone 12 / Pixel 6; map
   shows pins within 10s.
2. Pan/zoom: subjective — note any stutter; capture FPS via
   instrumentation already in map.html (logged via `LOG` message).
3. Pin tap → detail sheet opens; list/card tap → map flies + sheet
   opens.
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
- **Fix agent constraints:** diff ≤ 200 lines per pass; touches
  only files cited by validator. May read prior `FIX_LOG.md`
  entries to avoid repeating failed fixes.
- **Fix log:** each phase has `mobile/_phase<N>/FIX_LOG.md`. Fix
  agent appends after each pass: pass number, summary, files
  changed, validator result. Three failed passes → escalate.
- **Reviewer agent:** runs once per phase after validator PASS.
  Opus model. Job is to find runtime-break risks the validator
  can't catch (race conditions, missing keyExtractor, useEffect
  deps, etc.). May trigger one fix pass before final PASS.
- **Cross-phase regression:** every phase's validator re-runs the
  prior phases' command-based checks (typecheck and smoke tests).
  If any prior phase regresses, current phase FAILS.
- **Escalation payload:** at 3-pass cap, fix agent produces:
  failing check IDs, what was tried each pass, hypothesis, specific
  human input requested.

**Parallelism rules:**

- Phases 0 → 1 → 2 → 2.5 → 3 → 4 → 5 sequential.
- Phase 3 is parallel ×5 across components, gated on Phase 2.5
  freeze. Post-merge conflict validator must PASS before Phase 4.
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

You only need to engage at:

1. Kick off each phase ("proceed with Phase N").
2. Sign off ("next") after reading validator final PASS.
3. Phase 5: run device builds, walk checklist, report failure
   item numbers.
4. Escalations: 3-pass loop without PASS.

Everything else is agent-owned.

---

## 11. Launch criteria

Ship to TestFlight (iOS) and Play Console internal testing (Android) when:

- All of Phases 0–4 PASS their validators and reviewer agents.
- Phase 5 checklist items 1–10 PASS on:
  - one iPhone (≥ iPhone 12, iOS ≥ 17)
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
| iPad | Phone-compat only (`requireFullScreen: true`); not a separate iPad layout | Real iPad layout is a v2 effort (split-view, multi-window, pointer); shipping with phone-stretched UI is acceptable for v1 |
| Push notifications | Out of scope | App is on-demand; no use case |
| Location permission ("near me") | Out of scope v1 | Hub picker is the entry point; geolocation is a v2 feature |
| Tile pre-cache for offline | Out of scope | First-launch UX requires network; cached tiles work for return visits |
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
 5. app.json: bundle IDs, splash, icon (placeholders fine),
    requireFullScreen: true, scheme: "dtp".
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
