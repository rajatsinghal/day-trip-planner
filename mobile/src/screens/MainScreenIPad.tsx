// MainScreenIPad — two-pane tablet layout for iPad.
//
// Structure:
//   SafeAreaView (react-native-safe-area-context)
//     Header row  (HubPicker | WhenPicker | ReasonChips | SettingsMenu)
//     Split row
//       Left pane  360pt landscape / 320pt portrait — DestinationList
//       Right pane flex:1 — MapWebView
//         IPadDetailPanel (absolute, slides in from right edge)
//   MobileDetailSheet is NOT rendered — IPadDetailPanel replaces it.
//
// Orientation: useWindowDimensions drives pane widths + Slide Over fallback.
// Slide Over fallback: width < 600pt → render MainScreenPhone instead.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HUBS_BY_ID, defaultHub, computeDayOptions } from '@dtp/core';
import { useStore } from '../store';
import {
  selectFilteredRows,
  selectMapPins,
} from '../store/selectors';
import { MapWebView, type MapWebViewHandle } from '../components/MapWebView';
import { HubPicker } from '../components/HubPicker';
import { WhenPicker } from '../components/WhenPicker';
import { SettingsMenu } from '../components/SettingsMenu';
import { ReasonChips } from '../components/ReasonFilter';
import { RetryBanner } from '../components/RetryBanner';
import { DestinationList, type DestinationListHandle } from '../components/DestinationList';
import { IPadDetailPanel } from '../components/IPadDetailPanel';
import { colors } from '../theme/colors';
import { MainScreenPhone } from './MainScreenPhone';

// ── Layout predicate ──────────────────────────────────────────────────────────
// Exported so App.tsx and the smoke test can call it without rendering.

export function shouldUseIPadLayout(width: number, isIPad: boolean): boolean {
  return isIPad && width >= 600;
}

// ── Pane width constants ──────────────────────────────────────────────────────

const PANE_WIDTH_LANDSCAPE = 360;
const PANE_WIDTH_PORTRAIT  = 320;
const LANDSCAPE_THRESHOLD  = 1024;

function listPaneWidth(windowWidth: number): number {
  return windowWidth >= LANDSCAPE_THRESHOLD
    ? PANE_WIDTH_LANDSCAPE
    : PANE_WIDTH_PORTRAIT;
}

// Window hour constants (mirrors web App.tsx / phone screen).
const WINDOW_MIN = 4;
const WINDOW_MAX = 22;

// ── MainScreenIPad ────────────────────────────────────────────────────────────

export default function MainScreenIPad() {
  const { width: windowWidth } = useWindowDimensions();
  const isIPad = Platform.OS === 'ios' && Platform.isPad;

  // Slide Over / Split View fallback: below 600pt → phone layout.
  // Static top-level import keeps the WebView mounted across rotation /
  // Slide Over toggles (App.tsx always renders MainScreenIPad).
  if (!shouldUseIPadLayout(windowWidth, isIPad)) {
    return <MainScreenPhone />;
  }

  return <IPadTwoPane windowWidth={windowWidth} />;
}

// ── Two-pane body ─────────────────────────────────────────────────────────────
// Separated from the outer shell so hooks always run in the two-pane branch.

interface IPadTwoPaneProps {
  windowWidth: number;
}

function IPadTwoPane({ windowWidth }: IPadTwoPaneProps) {
  // ── store subscriptions ────────────────────────────────────────────────────
  // useShallow keeps the screen from re-rendering on unrelated state changes
  // (e.g. failedIds, retrying). weatherByDest still triggers re-render on
  // every NWS arrival because the action creates a new object reference —
  // necessary because pin colors update.
  const {
    selectedHubId, selectedDay, windowHours, selectedReasons,
    weatherByDest, selectedId, detailId, loading, tempUnit,
  } = useStore(
    useShallow((s) => ({
      selectedHubId:   s.selectedHubId,
      selectedDay:     s.selectedDay,
      windowHours:     s.windowHours,
      selectedReasons: s.selectedReasons,
      weatherByDest:   s.weatherByDest,
      selectedId:      s.selectedId,
      detailId:        s.detailId,
      loading:         s.loading,
      tempUnit:        s.tempUnit,
    })),
  );

  // ── store actions ──────────────────────────────────────────────────────────
  const setDay                = useStore((s) => s.setDay);
  const setWindow             = useStore((s) => s.setWindow);
  const setSelectedId         = useStore((s) => s.setSelectedId);
  const setDetailId           = useStore((s) => s.setDetailId);
  const clearDetailIfFiltered = useStore((s) => s.clearDetailIfFiltered);

  // ── derived ────────────────────────────────────────────────────────────────
  const hub = HUBS_BY_ID.get(selectedHubId) ?? defaultHub;

  // useMemo so the effects below only fire when their underlying inputs
  // actually change (proxy-memoize on the selectors handles deeper changes).
  const filteredRows = useMemo(
    () => selectFilteredRows(
      { weatherByDest, selectedDay, windowHours, selectedReasons }, hub,
    ),
    [weatherByDest, selectedDay, windowHours, selectedReasons, hub],
  );
  const mapPins = useMemo(
    () => selectMapPins(
      { weatherByDest, selectedDay, windowHours, selectedReasons, selectedId }, hub,
    ),
    [weatherByDest, selectedDay, windowHours, selectedReasons, selectedId, hub],
  );
  const dayOptions = useMemo(() => computeDayOptions(), []);

  // ── refs ───────────────────────────────────────────────────────────────────
  const mapRef  = useRef<MapWebViewHandle>(null);
  const listRef = useRef<DestinationListHandle>(null);

  // ── hub switch flow ────────────────────────────────────────────────────────
  const prevHubIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevHubIdRef.current === selectedHubId) return;
    prevHubIdRef.current = selectedHubId;

    const newHub = HUBS_BY_ID.get(selectedHubId) ?? defaultHub;
    const pins = selectMapPins(
      {
        weatherByDest:   useStore.getState().weatherByDest,
        selectedDay:     useStore.getState().selectedDay,
        windowHours:     useStore.getState().windowHours,
        selectedReasons: useStore.getState().selectedReasons,
        selectedId:      null,
      },
      newHub,
    );

    mapRef.current?.setHub(
      newHub.id,
      { lat: newHub.center.lat, lon: newHub.center.lon, name: newHub.center.name },
      pins,
    );
  }, [selectedHubId]);

  // ── day / filter → SET_PINS ────────────────────────────────────────────────
  // Memoize the JSON serialization on the same inputs as mapPins so we don't
  // re-stringify on every render — only when mapPins's identity changes.
  const mapPinsJson = useMemo(() => JSON.stringify(mapPins), [mapPins]);
  const prevPinsRef = useRef<string>('');

  useEffect(() => {
    if (mapPinsJson === prevPinsRef.current) return;
    prevPinsRef.current = mapPinsJson;
    if (!prevHubIdRef.current) return;
    mapRef.current?.setPins(selectedHubId, mapPins);
  }, [mapPinsJson, mapPins, selectedHubId]);

  // ── selected → fly-to + SET_SELECTED ──────────────────────────────────────
  useEffect(() => {
    if (selectedId == null) {
      mapRef.current?.setSelected(null);
      return;
    }
    mapRef.current?.flyTo(selectedId);
    mapRef.current?.setSelected(selectedId);
    listRef.current?.scrollToId(selectedId);
  }, [selectedId]);

  // ── clearDetailIfFiltered ──────────────────────────────────────────────────
  useEffect(() => {
    if (detailId == null) return;
    const filteredIds = new Set(filteredRows.map((r) => r.id));
    clearDetailIfFiltered(filteredIds);
  }, [filteredRows, detailId, clearDetailIfFiltered]);

  // ── AppState handler ───────────────────────────────────────────────────────
  // Lifted to App.tsx (single subscription) — see App.tsx for refetch logic.
  // MapWebView has its own internal AppState heartbeat for the WebView itself.

  // ── row tap ────────────────────────────────────────────────────────────────
  const handleSelectId = useCallback(
    (id: string) => {
      setSelectedId(id);
      setDetailId(id);
    },
    [setSelectedId, setDetailId],
  );

  // ── pin tap ────────────────────────────────────────────────────────────────
  const handlePinTap = useCallback(
    (destId: string) => {
      setSelectedId(destId);
      setDetailId(destId);
    },
    [setSelectedId, setDetailId],
  );

  // ── WhenPicker callbacks ───────────────────────────────────────────────────
  const handleWindowChange = useCallback(
    (start: number, end: number) => setWindow([start, end]),
    [setWindow],
  );

  const paneWidth = listPaneWidth(windowWidth);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      {/* ── Header: full-width single row ──────────────────────────────── */}
      <View style={styles.header}>
        <HubPicker />
        <View style={styles.headerCenter}>
          <WhenPicker
            dayOptions={dayOptions}
            selectedDay={selectedDay}
            onSelectDay={setDay}
            windowStart={windowHours[0]}
            windowEnd={windowHours[1]}
            windowMin={WINDOW_MIN}
            windowMax={WINDOW_MAX}
            onWindowChange={handleWindowChange}
          />
        </View>
        {/* ReasonChips: more chips visible than phone because header is wider */}
        <View style={styles.filterArea}>
          <ReasonChips />
        </View>
        <SettingsMenu />
      </View>

      {/* ── RetryBanner spans full width ───────────────────────────────── */}
      <RetryBanner />

      {/* ── Two-pane split row ─────────────────────────────────────────── */}
      <View style={styles.splitRow}>
        {/* Left pane: DestinationList, fixed width by orientation */}
        <View style={[styles.leftPane, { width: paneWidth }]}>
          <DestinationList
            ref={listRef}
            rows={filteredRows}
            selectedId={selectedId}
            loading={loading}
            tempUnit={tempUnit}
            onSelectId={handleSelectId}
          />
        </View>

        {/* Right pane: map + detail panel overlay */}
        <View style={styles.rightPane}>
          <MapWebView
            ref={mapRef}
            onPinTap={handlePinTap}
            backgroundColor={colors.slate50}
          />
          {/* IPadDetailPanel is positioned absolute inside the right pane */}
          <IPadDetailPanel hub={hub} />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
    gap: 8,
    backgroundColor: colors.white,
  },
  headerCenter: {
    // WhenPicker sits in the middle; shrink if needed.
    flexShrink: 1,
  },
  filterArea: {
    // ReasonChips expands to fill remaining header space.
    flex: 1,
    minWidth: 0,
  },
  splitRow: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPane: {
    // width set dynamically via inline style (paneWidth).
    borderRightWidth: 1,
    borderRightColor: colors.slate200,
    flexDirection: 'column',
  },
  rightPane: {
    flex: 1,
    position: 'relative',
  },
});
