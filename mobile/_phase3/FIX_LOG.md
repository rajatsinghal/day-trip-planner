# Phase 3 FIX_LOG

## Pass 1 — Runtime / A11y / Perf fixes

### BLOCKERs fixed

**BLOCKER 1 — WhenPicker.tsx — accessibilityViewIsModal**
Added `accessibilityViewIsModal` to `<View style={styles.sheet}>` inside the Modal
so VoiceOver/TalkBack treats the bottom sheet as a modal region.

**BLOCKER 2 — MobileDetailSheet.tsx + WhenPicker.tsx — Backdrop accessibilityRole**
Added `accessibilityRole="button"` to the backdrop `<Pressable>` in both files.
MobileDetailSheet line ~75, WhenPicker line ~82.

**BLOCKER 3 — HourRangeSlider.tsx — Slider thumb a11y**
The `@miblanchard/react-native-slider` library does not accept `accessibilityLabel`
or `accessibilityValue` on the `<Slider>` component (not in its TypeScript types).
Fell back to wrapping the `sliderWrapper` View with `accessible`, `accessibilityLabel`,
and `accessibilityValue={{ text: "X to Y" }}` — VoiceOver reads the combined range
as a single accessible element.

### MAJORs fixed

**MAJOR 4 — BottomCardStrip.tsx — useEffect dep array / rows re-fire**
- Added `rowsRef` (ref updated each render) so the imperative handle reads rows
  without closing over a stale reference.
- Added `idToIndex` (useMemo, stable when rows identity is stable) as the lookup map.
- useEffect now depends on `[selectedId, idToIndex]` — rows object identity is no
  longer in the dep array.
- Added `lastScrolledIndex` ref; effect bails if already scrolled to that index.

**MAJOR 5 — DestinationList.tsx — onScrollToIndexFailed**
Added `handleScrollToIndexFailed` callback that falls back to
`scrollToOffset(index * (ROW_HEIGHT + SEPARATOR_HEIGHT))`. Passed to FlatList.

**MAJOR 6 — useImperativeHandle dep arrays**
- DestinationList: added `[idToIndex]` as third argument.
- BottomCardStrip: added `[]` (handle only reads rowsRef.current, never stale).

**MAJOR 7 — MobileDetailSheet.tsx — narrow store subscriptions**
Replaced the broad `selectEnrichedRows(s, hub)` subscription (returns new array on
every state change) with four narrow subscriptions: `detailId`, `weatherByDest[detailId]`,
`selectedDay`, `windowHours`. Enrichment computed inside a `useMemo` local to the sheet.
Import of `selectEnrichedRows` removed; `selectDisplayWindow` imported instead.
Additional `@dtp/core` imports: `aggregateHourlyToDaily`, `haversineKm`, `estimateDriveMinutes`.

**MAJOR 8 — SettingsMenu.tsx — nested Pressable touch propagation**
Replaced inner panel `<Pressable onPress={absorb}>` with a `<View onStartShouldSetResponder={() => true}>`.
The backdrop is now a sibling absolute-fill `<Pressable>` and the panel is rendered in
a separate absolute-fill `<View pointerEvents="box-none">` so taps on the panel don't
reach the backdrop at all on Android.

**MAJOR 9 — BottomCardStrip.tsx — inline arrow in renderItem**
Extracted a memoized `CardItem` component that receives `row`, `isSelected`, and `onPress`
as stable props. `renderItem` now only creates new closures when `selectedId` or `handlePress`
change, not per-item per-render.

**MAJOR 10 — BottomCardStrip.tsx — getItemLayout**
Added `getItemLayout={(_, i) => ({ length: SNAP_INTERVAL, offset: SNAP_INTERVAL * i, index: i })}`.

**MAJOR 11 — BottomCardStrip.tsx — accessibilityState selected**
`CardItem` Pressable now has `accessibilityState={{ selected: isSelected }}`.

**MAJOR 12 — HubPicker.tsx — chevron a11y**
Added `accessibilityElementsHidden` and `importantForAccessibility="no-hide-descendants"`
to the chevron `<Text>` so screen readers skip the decorative character.

**MAJOR 13 — DayChips.tsx — hit target**
Added `hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}` to each chip Pressable,
expanding the touch target to satisfy the 44pt minimum.

**MINOR 14 — DestinationList.tsx — getItemLayout separator drift**
Added `SEPARATOR_HEIGHT = 1` constant. `getItemLayout` now uses
`length: ROW_HEIGHT + SEPARATOR_HEIGHT` and `offset: (ROW_HEIGHT + SEPARATOR_HEIGHT) * index`.
The same arithmetic is used in `onScrollToIndexFailed`.

---

### Deferred items (not addressed in Pass 1)

- **RetryBanner double subscription** — `anyFailed` via `useStore(selectAnyFailed)` and
  `failedCount` via `useStore(s => s.failedIds.size)` both subscribe; the banner could
  use a single combined selector. Low impact — banner is only visible during failures.

- **HubPicker FlatList getItemLayout** — The HubPicker FlatList has no `getItemLayout`.
  Row count is small (≤10 hubs) so the impact is negligible, but it would be consistent
  to add it with a fixed ROW_HEIGHT.

- **MobileDetailSheet slide animation reset on close** — The sheet doesn't animate out
  on close; it just disappears when `destination` becomes null. A reverse timing animation
  on close would improve the UX.

- **SettingsMenu accessibilityViewIsModal placement nuance** — The panel `<View>` does
  not currently have `accessibilityViewIsModal`. Adding it would tell VoiceOver that
  elements outside the panel are inert while it's open (a11y improvement, not a blocker
  because the outer backdrop Pressable covers the rest of the screen).

- **RetryBanner accessibilityLiveRegion node placement** — `accessibilityLiveRegion="polite"`
  is on the outer `<View>` which is correct, but on Android the live region node must be
  high enough in the tree to be seen by the system. If the banner ever appears inside a
  scroll container it may need to be hoisted.

- **WhenPicker backdrop accessibilityRole** — Fixed in this pass (BLOCKER 2).

- **DestinationList DestinationRow not memo'd** — `DestinationRow` is an inner function
  component and is not wrapped in `React.memo`. Each re-render of `DestinationList`
  recreates the component reference. Wrapping in `memo` and ensuring `onPress` is stable
  (already done via useCallback in the row) would prevent unnecessary re-renders.
