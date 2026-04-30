# Mobile port: design and agentic dev plan

Plan for shipping the day-trip-planner as native iOS and Android apps
(plus iPad) using a hybrid architecture: an Expo/React Native shell
with a MapLibre GL JS map embedded via `react-native-webview`.

The plan is structured so that each phase is an **agent-driven task**
with explicit PASS/FAIL validation criteria. The agentic cycle is
develop → validate → fix, looped until a phase passes. Human
engagement is limited to phase-boundary sign-off and the one phase
that genuinely requires a physical device (Phase 5).

---

## 1. Why hybrid

Both pure approaches have known, documented issues:

- **Capacitor (full web-app-in-WebView):** architectural WebGL ceiling
  in WKWebView; 110+ DOM-based markers panning in a WebView will feel
  worse than native; App Store 4.2 (thin-wrapper) risk.
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
│  │  selectedHub         │  │   HubPicker                  │    │
│  │  selectedDay         │  │   WhenPicker                 │    │
│  │  windowHours         │  │   ReasonFilter               │    │
│  │  tempUnit            │  │   DestinationList (FlatList) │    │
│  │  selectedReasons     │  │   BottomCardStrip            │    │
│  │  weatherByDest       │  │   MobileDetailSheet          │    │
│  │  (MMKV persistence)  │  │   SettingsMenu               │    │
│  └──────────┬───────────┘  └──────────────┬───────────────┘    │
│             │                             │                     │
│             │  enriched pins +            │                     │
│             │  center + style             │                     │
│             ▼                             ▼                     │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ MapWebView.tsx (react-native-webview)                │      │
│  │   bundles map/index.html + MapLibre GL JS            │      │
│  │   postMessage bridge (typed protocol)                │      │
│  │                                                       │      │
│  │   ┌─────────────────────────────────────────────┐    │      │
│  │   │ map/index.html (WebView)                    │    │      │
│  │   │   MapLibre GL JS, OpenFreeMap tiles         │    │      │
│  │   │   Pin rendering (GeoJSON symbol layer)      │    │      │
│  │   │   flyTo, tap handlers                       │    │      │
│  │   └─────────────────────────────────────────────┘    │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ lib/ (pure TS, ported unchanged)                     │      │
│  │   weather.ts, geo.ts, days.ts, units.ts             │      │
│  │   nws.ts (MMKV swap), reasons_to_visit.tsx (SVG)    │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
         │                                        │
         ▼                                        ▼
  api.weather.gov                         tiles.openfreemap.org
  (fetched from native)                   (fetched from WebView)
```

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
| **Map rendering** | **WebView** | MapLibre GL JS only; avoids MapLibre RN Android bugs |
| Pin tap / fly-to | WebView → Native via bridge | Map emits events; native owns logic |
| Tile fetching | WebView | Standard MapLibre behavior; tiles cached in WebView |

**Rule of thumb:** if it renders map pixels, it's WebView. Everything
else is native.

---

## 4. Bridge protocol

Typed `postMessage` contract. Defined once in
`src/map/bridge-protocol.ts` and imported by both sides.

### Native → Map

```ts
type NativeToMap =
  | { type: 'INIT'; center: { lat: number; lon: number }; styleUrl: string }
  | { type: 'SET_PINS'; pins: MapPin[] }
  | { type: 'FLY_TO'; destId: string }
  | { type: 'SET_SELECTED'; destId: string | null };

interface MapPin {
  id: string;
  lat: number;
  lon: number;
  emoji: string;           // weather emoji
  color: string;           // pin fill (from weather code)
  selected: boolean;
}
```

### Map → Native

```ts
type MapToNative =
  | { type: 'MAP_READY' }
  | { type: 'PIN_TAPPED'; destId: string }
  | { type: 'MAP_ERROR'; message: string };
```

### Transport

- **Native → Map:** `webViewRef.current.injectJavaScript(...)`
  with a serialized message; map registers a global
  `window.handleNativeMessage`.
- **Map → Native:** `window.ReactNativeWebView.postMessage(JSON.stringify(msg))`;
  native receives via `onMessage` prop.

### Contract invariants

1. Native waits for `MAP_READY` before sending any non-INIT message.
2. `SET_PINS` is idempotent; sending same payload is a no-op on the map side.
3. All messages are JSON-serializable; no functions, Dates, or undefineds.

---

## 5. Project structure

New Expo project at `mobile/` inside this repo (keeps the web app
untouched, shares the `lib/` and `hubs/` source via symlink or
direct import path).

```
day-trip-planner/
├── src/                          # existing web app (unchanged)
│   ├── hubs/
│   ├── lib/
│   └── components/
│
└── mobile/                       # NEW
    ├── app.json                  # Expo config
    ├── package.json
    ├── tsconfig.json
    ├── App.tsx                   # root
    ├── assets/
    │   └── map/
    │       ├── index.html        # bundled map HTML
    │       └── maplibre.js       # vendored MapLibre GL JS
    ├── src/
    │   ├── screens/
    │   │   └── MainScreen.tsx    # the whole app UI
    │   ├── components/
    │   │   ├── MapWebView.tsx    # WebView + bridge
    │   │   ├── DestinationList.tsx
    │   │   ├── BottomCardStrip.tsx
    │   │   ├── MobileDetailSheet.tsx
    │   │   ├── HubPicker.tsx
    │   │   ├── WhenPicker.tsx
    │   │   ├── HourRangeSlider.tsx
    │   │   ├── DayChips.tsx
    │   │   ├── ReasonFilter.tsx
    │   │   └── SettingsMenu.tsx
    │   ├── store/
    │   │   ├── index.ts          # Zustand store
    │   │   └── persist.ts        # MMKV adapter
    │   ├── map/
    │   │   └── bridge-protocol.ts
    │   ├── lib/                  # copy of ../../src/lib (see below)
    │   │   ├── weather.ts
    │   │   ├── geo.ts
    │   │   ├── days.ts
    │   │   ├── units.ts
    │   │   ├── nws.ts            # MMKV swap
    │   │   └── reasons_to_visit.tsx   # react-native-svg rewrite
    │   └── hubs/                 # copy of ../../src/hubs
    └── eas.json                  # EAS Build config
```

**lib/ and hubs/ sharing:** copy rather than symlink (symlinks bite
Metro bundler). A small script `mobile/scripts/sync-shared.ts`
copies `../src/hubs/*.ts` and the portable `../src/lib/*.ts` files
on build. Two files diverge (`nws.ts`, `reasons_to_visit.tsx`) and
live only in `mobile/src/lib/`.

---

## 6. Dev phases

Each phase is a discrete agent task with its own PASS/FAIL criteria.
Phases 0–2 are sequential (each depends on the previous). Phase 3 is
parallel (multiple component agents run concurrently). Phase 4
integrates. Phase 5 is the one human-touched phase (device testing).

### Phase 0 — Scaffold

**Agent:** `general-purpose`, single agent, sonnet.

**Scope:**
- Init Expo SDK 52+ project at `mobile/` with TypeScript strict mode.
- Install deps: `react-native-webview`, `react-native-mmkv`,
  `zustand`, `react-native-svg`, `react-native-gesture-handler`,
  `react-native-reanimated`, `@expo/vector-icons`.
- Configure `app.json` (name, slug, icon, splash, bundle IDs).
- Configure EAS Build (`eas.json`) for dev client and preview builds.
- Create `mobile/scripts/sync-shared.ts` and run it once.
- Port `lib/nws.ts`: swap `localStorage` for MMKV (sync API).
- Port `lib/reasons_to_visit.tsx`: inline `<svg>` → `react-native-svg` primitives.
- Stub `App.tsx` that renders "Hello" and a typecheck target.
- Run `npx expo prebuild` to generate iOS/Android projects.

**Validation (PASS criteria):**
- [ ] `cd mobile && npx tsc --noEmit` exits 0.
- [ ] `cd mobile && npx expo prebuild` exits 0 and produces `ios/` + `android/` dirs.
- [ ] `cd mobile && npx expo export` succeeds.
- [ ] `sync-shared.ts` copied the expected files (validator agent checks
  file list against manifest).
- [ ] MMKV port of `nws.ts`: no `localStorage` references remain; all
  call sites still compile.
- [ ] SVG port of `reasons_to_visit.tsx`: no `<svg>`/`<path>`/`<rect>`/
  `<line>` etc. JSX remain; only `react-native-svg` components.

**Sub-agent roles:**
- **Developer agent:** implements the above.
- **Validator agent:** greps for `localStorage`, `<svg`, `<path`, etc.,
  runs `tsc`, runs `expo prebuild`, reports PASS/FAIL with file:line
  citations.
- **Fix agent:** if validator fails, receives the validator report
  and addresses each cited issue.

---

### Phase 1 — Map WebView

**Agent:** `general-purpose`, single agent, opus (highest-risk phase).

**Scope:**
- Create `mobile/assets/map/index.html`:
  - Loads locally-bundled MapLibre GL JS (vendored into `maplibre.js`).
  - OpenFreeMap Positron style via raw URL (same as web).
  - Renders pins as a **GeoJSON symbol layer** (not DOM markers —
    this solves the 110+ pin perf concern).
  - Pin styling: text-field = emoji, icon-image = colored circle
    generated from a small set of pre-rendered PNGs (one per weather
    color) bundled alongside.
  - Handles `INIT`, `SET_PINS`, `FLY_TO`, `SET_SELECTED`.
  - Emits `MAP_READY`, `PIN_TAPPED`, `MAP_ERROR`.
- Create `mobile/src/map/bridge-protocol.ts` (types only).
- Create `mobile/src/components/MapWebView.tsx`:
  - `WebView` embedding `index.html` via `source={{ uri: Asset... }}`.
  - `onMessage` parses and dispatches to props (`onReady`, `onPinTap`).
  - Exposes imperative methods: `setPins()`, `flyTo()`, `setSelected()`.
  - Handles `AppState` change (reloads pins on foreground).

**Validation (PASS criteria):**
- [ ] Bridge protocol types import cleanly on both sides.
- [ ] Grep: `index.html` message handlers match the union exhaustively.
- [ ] Native-side `MapWebView` handles all `MapToNative` variants.
- [ ] `MapWebView` is a ref-forwarded component with typed imperative handle.
- [ ] No `new maplibregl.Marker()` (DOM marker) usage — only GeoJSON layer.
- [ ] Typecheck passes.
- [ ] A harness screen (temporary) renders 100 fake pins and logs
  `MAP_READY` to the Metro console. (Developer agent produces this
  harness; validator agent reads the expected console output from a
  spec, then the human runs it once in Phase 5 to confirm. Or, if an
  iOS simulator is available headlessly, a scripted smoke test can
  launch the harness and scrape logs.)

**Sub-agent roles:**
- **Developer agent (opus):** implements HTML + native wrapper + protocol.
- **Protocol validator agent (sonnet):** reads both sides of the
  bridge and confirms every variant is handled; reports any missing.
- **Static analysis validator (sonnet):** grep for banned patterns
  (`maplibregl.Marker`, `localStorage`, etc.), run typecheck.
- **Fix agent:** addresses specific issues cited.

---

### Phase 2 — State layer

**Agent:** `general-purpose`, single agent, sonnet.

**Scope:**
- Create `mobile/src/store/index.ts` (Zustand):
  - Slices: `selectedHubId`, `selectedDay`, `windowHours`, `tempUnit`,
    `selectedReasons`, `weatherByDest`.
  - Actions: `setHub`, `setDay`, `setWindow`, `setTempUnit`,
    `toggleReason`, `setWeather`.
  - Derived selectors (using `useShallow` or `reselect`):
    `enrichedDestinations(selectedDay)` — mirrors the `App.tsx`
    `useMemo` exactly.
- Create `mobile/src/store/persist.ts`:
  - MMKV-backed persistence middleware for Zustand.
  - Persists: `selectedHubId`, `windowHours`, `tempUnit`, `selectedReasons`.
  - Does NOT persist: `weatherByDest` (fetched fresh) or `selectedDay`
    (computed).
- Create `mobile/src/store/fetchWeather.ts`:
  - Concurrency-limited worker pool (size 8), port of the App.tsx
    effect.
  - Streams results into the store per-destination.
  - Cancels on hub switch via `AbortController`.

**Validation (PASS criteria):**
- [ ] Typecheck.
- [ ] Store shape matches a schema (validator agent checks against a
  spec in this doc).
- [ ] Derived `enrichedDestinations` produces identical output to
  the web `App.tsx` equivalent for a fixed fake input (snapshot test,
  added in `mobile/__tests__/store.test.ts`; runs via `jest` or
  `vitest` configured in Phase 0).
- [ ] Persistence: mutating a persisted slice and re-creating the
  store reads back the value (unit test).
- [ ] `fetchWeather` cancels in-flight requests on hub switch (unit
  test with a mocked fetch).

**Sub-agent roles:**
- **Developer agent:** implements store + persistence + fetch worker.
- **Test agent:** writes the three unit tests listed above.
- **Validator agent:** runs `npm test`, runs typecheck, diffs store
  shape vs. spec.
- **Fix agent:** addresses test failures.

---

### Phase 3 — Native UI components (PARALLEL)

**Agents:** five concurrent developer agents, sonnet. Each owns one
component subtree. All read the same store; dependencies are only on
the store interface from Phase 2.

**Split:**

| Agent | Component(s) | References |
|---|---|---|
| 3a | `DayChips`, `HourRangeSlider`, `WhenPicker` | `src/components/DayChips.tsx`, `HourRangeSlider.tsx`, `WhenPicker.tsx` |
| 3b | `ReasonFilter`, `SettingsMenu` | `src/components/ReasonFilter.tsx`, `SettingsMenu.tsx` |
| 3c | `DestinationList` (FlatList) | `src/components/SideList.tsx` (drop hover popover) |
| 3d | `BottomCardStrip` | `src/components/BottomCardStrip.tsx` |
| 3e | `MobileDetailSheet` + `HubPicker` | `src/components/MobileDetailSheet.tsx`; new HubPicker replaces `<select>` |

**Common rules for all 3x agents:**
- Read the original web component to understand behavior.
- Do NOT port Tailwind classes verbatim; translate to `StyleSheet`
  (or NativeWind v4 if adopted in Phase 0 — decided at scaffold time).
- Replace all DOM APIs per the mapping in this doc's §8.
- Drop desktop-only UX (hover popover, keyboard shortcuts).
- Read from and write to the Zustand store; do not duplicate state.
- `<svg>` icons use `react-native-svg`.

**Validation (PASS criteria, per component):**
- [ ] Typecheck.
- [ ] No DOM APIs: grep for `document.`, `window.`, `addEventListener`,
  `getBoundingClientRect`, `scrollIntoView`, `MutationObserver`.
- [ ] No Tailwind classes: grep for `className=` (StyleSheet only)
  OR if using NativeWind, `className=` is the only styling and no
  raw `style={}` leaks.
- [ ] Reads only the store slices it needs (validator agent checks
  `useStore` selectors are narrow).
- [ ] Visual parity spec: validator agent compares structure against
  original web component (not pixel-for-pixel — element hierarchy and
  semantic labels must match).

**Sub-agent roles per component:**
- **Developer agent (sonnet):** ports the component.
- **Validator agent (sonnet):** runs the checks above, reports issues.
- **Fix agent (sonnet):** addresses issues.

---

### Phase 4 — Integration

**Agent:** `general-purpose`, single agent, sonnet.

**Scope:**
- Wire `MainScreen.tsx`: layout the native components + map WebView
  in one mobile-first screen (no desktop layout).
- App shell: `SafeAreaView`, status bar handling, keyboard avoidance.
- `AppState` handler: on `active` resume, re-send pin payload to map
  WebView (covers the WebView-blank-on-resume issue).
- Hub switch flow: cancel in-flight NWS fetches, clear
  `weatherByDest`, send new `INIT` to map, refetch.
- Day switch flow: update store, re-compute derived `enrichedDestinations`,
  re-send `SET_PINS` with new colors/emojis.
- Pin tap flow: `MAP_TAPPED` → store sets selected → `MobileDetailSheet` opens.
- List tap flow: set selected → `FLY_TO` to map → detail sheet opens.
- Splash screen, app icon (placeholder OK; real assets from user later).

**Validation (PASS criteria):**
- [ ] Typecheck.
- [ ] `expo export` succeeds.
- [ ] Integration contract: validator agent walks through each user
  flow (hub switch, day switch, pin tap, list tap, background/resume,
  filter toggle) and confirms the code paths exist end-to-end.
- [ ] No dead imports; no unused exports.
- [ ] Bundle size under 20 MB (sanity check).

**Sub-agent roles:**
- **Developer agent:** integrates.
- **Flow validator agent (opus):** reads the integrated code and
  traces each user flow, reporting any broken chain.
- **Fix agent:** patches broken chains.

---

### Phase 5 — Device validation (human-touched)

This is the one phase that genuinely requires human involvement,
because it's impossible to faithfully validate UX without a real
device.

**Scope:**
- User runs `cd mobile && npx expo run:ios` (or EAS Build → TestFlight).
- User follows a **test checklist** produced by the validator agent.
- Each item on the checklist has a PASS/FAIL outcome.
- FAIL items are reported back (just the item number + description);
  a fix agent investigates and patches, then the user re-runs that item.

**Checklist categories (generated by agent):**
1. Cold launch: app starts, map renders, pins appear within 10s.
2. Pan/zoom: 60fps on iPhone 12+, acceptable on older.
3. Pin tap → detail sheet opens.
4. List tap → map flies to pin + detail sheet opens.
5. Hub switch: all pins update; no stale markers.
6. Day switch: pin colors/emojis update.
7. Filter toggle: list filters; map pins filter.
8. Background/foreground: map not blank.
9. Offline launch: cached hubs visible, map shows cached tiles where
   available.
10. Memory: switching hubs 5 times in a row doesn't crash.

**Sub-agent roles:**
- **Checklist generator (sonnet):** reads this doc + integrated code
  and produces the actual test checklist as `mobile/TEST_CHECKLIST.md`.
- **Fix agent (sonnet):** triages reported failures, patches,
  re-validates via typecheck + flow walk, asks user to re-test.

**User touchpoints in Phase 5:**
- One command to build (`expo run:ios` or EAS Build link).
- Report FAIL item numbers.
- Confirm fixes by re-running.

---

## 7. Agentic cycle

Every phase follows this loop:

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
                                │  runs checks    │
                                └────────┬────────┘
                                         │
                               PASS ◄────┴────► FAIL
                                │                  │
                                │                  ▼
                                │         ┌─────────────────┐
                                │         │  FIX AGENT      │
                                │         │  reads report,  │
                                │         │  patches code   │
                                │         └────────┬────────┘
                                │                  │
                                │                  └──► back to VALIDATOR
                                ▼
                         advance to next phase
```

### Cycle contracts

- **Developer → Validator handoff:** developer writes a one-paragraph
  summary of what it changed, pointing at file:line for each change.
- **Validator report format:** a structured list of `{ pass: bool, check: string, detail: string, file?: string, line?: number }`.
- **Fix agent input:** the full validator report + the file diffs
  from the developer agent. Fix agent addresses only cited issues —
  does not refactor beyond scope.
- **Loop cap:** 3 passes. If validator still reports FAIL after 3
  fix cycles, escalate to human.

### Parallelism rules

- Phases 0, 1, 2, 4, 5 are sequential (each depends on prior).
- Phase 3 is parallel across 5 component groups.
- Within a phase, developer → validator → fix is sequential; no
  skipping validator.

---

## 8. Web-to-native API mapping (shared reference)

Used by all Phase 3 component agents.

| Web pattern | Native replacement |
|---|---|
| `<div>` | `<View>` |
| `<button>` | `<Pressable>` (with `pressed` state styles) |
| `<a href>` | `<Pressable onPress={() => Linking.openURL(...)}>` |
| `<ul>` / `<li>` | `<FlatList>` (>10 items) or `<ScrollView>` + `<View>` |
| `<img src>` | `<Image source={require(...)}>` |
| `<svg>` + children | `<Svg>` from `react-native-svg` + primitives |
| `<select>` | Custom `Picker` sheet or `@react-native-picker/picker` |
| `<input type="range">` | Custom Gesture Handler slider or `@miblanchard/react-native-slider` |
| Tailwind classes | `StyleSheet` (or NativeWind v4) |
| `onClick` | `onPress` |
| `onMouseEnter` / `onMouseLeave` | **dropped** (no hover on touch) |
| `hover:` styles | **dropped** |
| `document.addEventListener('keydown')` | **dropped** (or Hardware keyboard for iPad only) |
| `document.addEventListener('mousedown')` (outside-click) | Transparent `Pressable` backdrop or `<Modal>` |
| `el.scrollIntoView(...)` | `flatListRef.current.scrollToIndex(...)` |
| `el.getBoundingClientRect()` | `Dimensions.get('window')` + `onLayout` |
| `localStorage` | `MMKV` (sync) — set up in Phase 0 |
| CSS `transition` / `animation` | `Animated` or `Reanimated` |
| `position: fixed` | `<Modal>` or absolute inside `SafeAreaView` |
| `window.location.search` / `URLSearchParams` | Expo Linking + deep links |
| `window.setTimeout` / `setTimeout` | `setTimeout` (same) |

---

## 9. Risks and fallbacks

| Risk | Likelihood | Mitigation |
|---|---|---|
| WebView blank after backgrounding | High | `AppState` handler re-sends `SET_PINS` on foreground; handled in Phase 4 |
| Tile loading over HTTPS with cert pinning | Low | Use standard HTTPS; `react-native-webview` handles by default |
| MapLibre GL JS bundle size inflates app | Medium | Vendor only used modules; gzip in asset pipeline; target <2MB JS |
| NWS API rate limits on fast hub switching | Medium | Concurrency cap 8 + `AbortController` on switch (already in plan) |
| MMKV migration from fresh install | Low | No migration needed (new install); persisted keys versioned with a `_v1` suffix |
| iOS App Store 4.2 rejection | Low | App is native; only map is WebView; uses native share, native picker |
| Android WebView variance across devices | Medium | Target Chrome 90+; test on 2–3 device profiles in Phase 5 |
| Expo prebuild drift on SDK updates | Low | Pin SDK version in `app.json`; update quarterly |
| `react-native-webview` iOS 18 memory kills | Medium | Already planned for; same handler covers this |

**Escape hatches:**
- If WebView map perf is unacceptable on target devices:
  swap to `@maplibre/maplibre-react-native` (already assessed;
  known Android issues; would be a Phase 1 re-do only — no change to
  Phases 2–5 because the bridge protocol + store are wrapper-agnostic).
- If MMKV causes native build friction: fall back to
  `@react-native-async-storage/async-storage` (async, requires
  reworking lazy initializers — tolerable).

---

## 10. Minimum human engagement

You (the maintainer) only need to engage at these moments:

1. **Kick off each phase.** A short "proceed with Phase N" — agents
   handle the rest within the phase.
2. **Sign off on a phase.** Read the validator's final PASS report
   and say "next."
3. **Phase 5 testing.** Run the build, walk the checklist, report
   failures by number.
4. **Escalations.** If the agentic loop hits its 3-pass cap without
   passing, resolve the blocker.

Everything else — implementation, validation, fixing — is agent-owned.

---

## 11. Launch criteria

Ship to TestFlight (iOS) and Play Console internal testing (Android) when:

- All of Phases 0–4 PASS their validators.
- Phase 5 checklist: items 1–8 PASS on one iPhone, one iPad, one Android.
- Bundle size < 40 MB installed.
- Cold launch < 3s on iPhone 12 / Pixel 5.
- Crash-free rate > 99% in the first 24h of TestFlight use.

---

## Appendix A — Agent task templates

These are the exact prompts to feed each agent. They're kept
self-contained so an agent can pick one up with no other context.

### Phase 0 scaffold agent prompt

```
Set up a new Expo SDK 52+ TypeScript project at /Users/rajatsinghal/Code/day-trip-planner/mobile.
Follow MOBILE_PLAN.md §6 Phase 0 exactly.
Deliverables:
 - mobile/ directory with working Expo project
 - All listed deps installed
 - nws.ts ported to MMKV (no localStorage)
 - reasons_to_visit.tsx ported to react-native-svg
 - Hello-world App.tsx that typechecks
 - sync-shared.ts script populating mobile/src/lib/ and mobile/src/hubs/
Run the validator checks listed in §6 Phase 0 yourself before reporting done.
Report PASS/FAIL for each checkbox with file:line citations.
```

### Phase 1 map WebView agent prompt

```
Implement the map WebView for the Expo app per MOBILE_PLAN.md §6 Phase 1.
Read §4 (bridge protocol) and §2 (architecture) before starting.
Key constraints:
 - Pins MUST be rendered as a GeoJSON symbol layer, not maplibregl.Marker DOM elements.
 - Bundle MapLibre GL JS locally under mobile/assets/map/.
 - Use typed bridge protocol from mobile/src/map/bridge-protocol.ts.
 - Exhaustively handle every message variant on both sides.
 - MapWebView.tsx must expose imperative handle via forwardRef.
Run validator checks listed in §6 Phase 1 before reporting done.
```

### Phase 3 component agent prompt (per component)

```
Port the web component at src/components/<NAME>.tsx to React Native at
mobile/src/components/<NewName>.tsx. Follow MOBILE_PLAN.md §6 Phase 3 and §8.
Do NOT port Tailwind classes verbatim; use StyleSheet.
Drop desktop-only UX (hover, keyboard shortcuts, outside-click via mousedown).
Read from the Zustand store (mobile/src/store); narrow selectors only.
Run the Phase 3 validator checks for this component before reporting done.
```

### Validator agent prompt (general)

```
Validate MOBILE_PLAN.md §6 Phase <N> for the most recent developer-agent output.
For each checkbox in that phase's PASS criteria, run the check and report
  { pass: bool, check: string, detail: string, file?: string, line?: number }.
Return the full list — do not short-circuit on first fail.
Do not fix anything. Your job is to report.
```

### Fix agent prompt (general)

```
Read the validator report at <path> and the file diffs from the prior developer agent.
For each FAIL item: patch the cited file/line to satisfy the check.
Do not refactor beyond the cited issue. Do not touch files not cited.
When done, re-run the validator checks yourself locally and report your own results.
```
