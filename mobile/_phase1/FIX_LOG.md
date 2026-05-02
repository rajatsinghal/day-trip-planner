# Phase 1 Fix Log

## Pass 1 (consolidated reviewer findings)

Addressed:

- **#1 BLOCKER (security):** `MapWebView.sendImmediate` now uses
  `JSON.stringify(JSON.stringify(msg))` — produces a JS string literal
  with all escapes (incl. U+2028/U+2029, backslashes, quotes) handled
  correctly. Replaces the manual `\\` / `'` regex escape that allowed
  attacker-controlled `destId` / `hubId` / `pin.id` / `center.name` /
  `styleUrl` containing line/paragraph separators to break out.
- **#2 BLOCKER (security):** WebView props tightened.
  `allowFileAccessFromFileURLs={false}`,
  `allowUniversalAccessFromFileURLs={false}`,
  `mixedContentMode="never"`,
  `originWhitelist={['https://localhost']}`,
  `cacheEnabled={false}` (also feeds #6).
- **#3 BLOCKER (runtime):** Bootstrap-vs-real-applyMessage race fixed.
  The bootstrap declares `var applyMessage` at script-tag scope
  (default impl: queue into `__pendingNativeQueue`) and registers
  `window.handleNativeMessage` once. The IIFE reassigns
  `applyMessage = realApplyMessage` once the real impl is ready, then
  drains `__pendingNativeQueue` through it. No wrapper rebind, no
  unwrapped-path hazard, INIT in the bootstrap queue flows through
  full validation + preInitQueue draining.
- **#4 MAJOR (runtime):** Single INIT path. `setHub` mutates
  `snapshotRef` (clearing `selectedId`) then calls
  `enqueueInitFromSnapshot()`. MAP_READY also calls the same helper.
  Eliminates the duplicate-INIT after a process-death reload.
- **#5 MAJOR (runtime):** Heartbeat in-flight guard. AppState→active
  skips firing a new heartbeat if one is still pending; resets via
  `.finally` so a normal cycle re-arms.
- **#6 BLOCKER (runtime, Android):** `forceReload` now ALWAYS bumps
  `reloadKey` (remounts the WebView), never calls `.reload()`.
  Combined with `cacheEnabled={false}`, guarantees re-execution of
  inlined scripts on Android. Process-death + WebGL-loss paths feed
  through the same helper.
- **#7 MAJOR (runtime):** `style.load` doubled handler resolved.
  `handleInit` now uses `map.once('style.load', ...)` so it fires
  only for the initial load; `handleSetStyle` keeps its own
  `.once`. Also made `installSpriteLayer`'s home-marker creation
  idempotent — removes any prior `homeMarker` before re-adding.
- **#8 MAJOR (runtime):** HEARTBEAT handled before the init gate in
  `realApplyMessage` — it's a JS-context liveness check that doesn't
  need the map. Eliminates spurious forceReload from a HEARTBEAT
  queued in `preInitQueue`.
- **#9 MAJOR (runtime):** Unmount cleanup `useEffect` clears all
  pending heartbeat timers (rejecting their promises), resets the
  outbox, and nulls the ref.
- **#10 MAJOR (security):** Field-type validation on both sides.
  WebView side: `isValid(msg)` rejects malformed INIT / SET_PINS /
  FLY_TO / SET_SELECTED / SET_STYLE / HEARTBEAT and logs a `LOG`.
  Native side: `handleMessage` checks types before invoking handler
  callbacks for PIN_TAPPED, TILE_ERROR, MAP_ERROR, HEARTBEAT_ACK.
- **#11 MAJOR (security):** Heartbeat nonce now uses
  `globalThis.crypto?.randomUUID?.()` with the previous
  `Math.random` string as fallback for environments without WebCrypto.
- **#12 MAJOR (a11y):** Outer `<View accessible={false}>` and
  `<WebView importantForAccessibility="no-hide-descendants"
  accessibilityIgnoresInvertColors={true} />`. Phase 3 sibling list
  will be the actual a11y tree.
- **#13 MAJOR (perf):** `Outbox.flushNext` now drains synchronously
  in a `while` loop while the gate is open. Setting timeouts only
  matters between message ticks when the gate is closed.

Deferred (not in scope of this pass):

- **CSP `<meta>`** in map.template.html — needs a deliberate
  whitelist that survives MapLibre's data: image / blob worker usage
  and OpenFreeMap tile/style endpoints. Belongs in a Phase 1.5 task.
- **Referrer policy** on the WebView's outbound fetches.
- **LOG rate limit** native-side. Currently every WebView log surfaces
  to `console.log`. Spam mitigation deferred until we see real volume.
- **styleUrl allowlist** check on the native side before injecting
  into INIT / SET_STYLE.
- **Sprite-layer placeholder swap** (the placeholder canvas-circle
  fallback in `loadSpriteImages` should be replaced with the real
  sprite assets from `build-sprites`); tracked separately.

## Validation transcript

`npx tsc --noEmit` → exit 0
`npm test -- bridge-handshake.smoke.test` → 5/5 PASS
`npm run build-map-html` → wrote assets/map.html (890266 bytes)
`wc -c assets/map.html` → 890564 (under 1.3MB cap)

Files changed:

- mobile/src/components/MapWebView.tsx
- mobile/assets/map.template.html
- mobile/assets/map.html (regenerated)
- mobile/src/map/outbox.ts
- mobile/_phase1/FIX_LOG.md (new)
