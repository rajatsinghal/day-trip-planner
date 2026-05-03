// MainScreenPhone — single-column phone layout for the DayTrip app.
// Wires all Phase 3 components together with the Zustand store and
// MapWebView imperative handle.
//
// Layout (top → bottom):
//   SafeAreaView
//     Header row: HubPicker | WhenPicker | SettingsMenu
//     Filter row: ReasonChips + ReasonCount (horizontal scroll)
//     RetryBanner          (auto-shows when selectAnyFailed)
//     TileFallbackBanner   (shows when TILE_ERROR received)
//     MapWebView           (fixed height ~320pt)
//     BottomCardStrip      (primary destination list, fixed ~140pt)
//   MobileDetailSheet      (Modal, renders over everything when detailId set)

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HUBS_BY_ID, defaultHub, computeDayOptions } from '@dtp/core';
import { useStore } from '../store';
import {
  selectFilteredRows,
  selectMapPins,
  selectAnyFailed,
} from '../store/selectors';
import { MapWebView, type MapWebViewHandle } from '../components/MapWebView';
import { HubPicker } from '../components/HubPicker';
import { WhenPicker } from '../components/WhenPicker';
import { SettingsMenu } from '../components/SettingsMenu';
import { ReasonChips, ReasonCount } from '../components/ReasonFilter';
import { RetryBanner } from '../components/RetryBanner';
import { TileFallbackBanner } from '../components/TileFallbackBanner';
import { BottomCardStrip, type BottomCardStripHandle } from '../components/BottomCardStrip';
import { MobileDetailSheet } from '../components/MobileDetailSheet';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// Fixed layout heights (pt).
const MAP_HEIGHT = 320;
const CARD_STRIP_HEIGHT = 140;

export function MainScreenPhone() {
  // ── store subscriptions ──────────────────────────────────────────────────
  // useShallow keeps the screen from re-rendering on unrelated state changes.
  // weatherByDest still triggers re-render on every NWS arrival (new object
  // reference) — necessary because pin colors update.

  const {
    selectedHubId, selectedDay, windowHours, selectedReasons,
    weatherByDest, selectedId, detailId, loading,
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
    })),
  );

  // ── store actions ────────────────────────────────────────────────────────

  const setDay         = useStore((s) => s.setDay);
  const setWindow      = useStore((s) => s.setWindow);
  const setSelectedId  = useStore((s) => s.setSelectedId);
  const setDetailId    = useStore((s) => s.setDetailId);
  const clearDetailIfFiltered = useStore((s) => s.clearDetailIfFiltered);

  // ── derived ──────────────────────────────────────────────────────────────

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
  const anyFailed = selectAnyFailed({ failedIds: useStore.getState().failedIds });

  // Day options are stable across the session; compute once.
  const dayOptions = useMemo(() => computeDayOptions(), []);

  // ── refs ─────────────────────────────────────────────────────────────────

  const mapRef  = useRef<MapWebViewHandle>(null);
  const cardRef = useRef<BottomCardStripHandle>(null);

  // ── TILE_ERROR tracking ───────────────────────────────────────────────────
  // Cleared when the hub changes (new INIT resets the map).

  const [hasTileError, setHasTileError] = useState(false);

  const handleTileError = useCallback(() => {
    setHasTileError(true);
  }, []);

  // ── hub switch flow ───────────────────────────────────────────────────────
  // When selectedHubId changes: send setHub to the map (INIT + SET_PINS),
  // clear the tile error flag (new hub = fresh tiles).

  const prevHubIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevHubIdRef.current === selectedHubId) return;
    prevHubIdRef.current = selectedHubId;

    const newHub = HUBS_BY_ID.get(selectedHubId) ?? defaultHub;
    const pins = selectMapPins(
      {
        weatherByDest: useStore.getState().weatherByDest,
        selectedDay:   useStore.getState().selectedDay,
        windowHours:   useStore.getState().windowHours,
        selectedReasons: useStore.getState().selectedReasons,
        selectedId:    null,
      },
      newHub,
    );

    mapRef.current?.setHub(
      newHub.id,
      { lat: newHub.center.lat, lon: newHub.center.lon, name: newHub.center.name },
      pins,
    );

    // Clear tile error — new hub triggers a fresh INIT.
    setHasTileError(false);
  }, [selectedHubId]);

  // ── day / filter → SET_PINS ───────────────────────────────────────────────
  // Whenever filteredRows, selectedDay, or mapPins change, push updated pins
  // to the map. mapPins is derived from filteredRows + selectedId, so any
  // change in filter, day, or weather lands here.

  // Memoize the JSON serialization on the same inputs as mapPins so we don't
  // re-stringify on every render — only when mapPins's identity changes.
  const mapPinsJson = useMemo(() => JSON.stringify(mapPins), [mapPins]);
  const prevPinsRef = useRef<string>('');

  useEffect(() => {
    if (mapPinsJson === prevPinsRef.current) return;
    prevPinsRef.current = mapPinsJson;

    if (!prevHubIdRef.current) return; // map not initialized yet
    mapRef.current?.setPins(selectedHubId, mapPins);
  }, [mapPinsJson, mapPins, selectedHubId]);

  // ── selected → fly-to + SET_SELECTED ────────────────────────────────────
  // When selectedId changes (from pin tap OR card tap), fly the map to it
  // and update the selected sprite.

  useEffect(() => {
    if (selectedId == null) {
      mapRef.current?.setSelected(null);
      return;
    }
    mapRef.current?.flyTo(selectedId);
    mapRef.current?.setSelected(selectedId);
    // Also scroll the card strip to this card.
    cardRef.current?.scrollToId(selectedId);
  }, [selectedId]);

  // ── clearDetailIfFiltered ────────────────────────────────────────────────
  // If the active detail destination was filtered out (reason toggle),
  // close the sheet.

  useEffect(() => {
    if (detailId == null) return;
    const filteredIds = new Set(filteredRows.map((r) => r.id));
    clearDetailIfFiltered(filteredIds);
  }, [filteredRows, detailId, clearDetailIfFiltered]);

  // ── AppState handler ─────────────────────────────────────────────────────
  // Lifted to App.tsx (single subscription, calls refetchIfStale).
  // MapWebView has its own internal AppState heartbeat for the WebView itself.

  // ── pin tap ───────────────────────────────────────────────────────────────

  const handlePinTap = useCallback(
    (destId: string) => {
      setSelectedId(destId);
      setDetailId(destId);
    },
    [setSelectedId, setDetailId],
  );

  // ── WhenPicker props ──────────────────────────────────────────────────────

  const handleWindowChange = useCallback(
    (start: number, end: number) => setWindow([start, end]),
    [setWindow],
  );

  // Derive display window clamp constants (mirroring selectors logic).
  const WINDOW_MIN = 4;
  const WINDOW_MAX = 22;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Header row ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <HubPicker />
        </View>
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
        <View style={styles.headerRight}>
          <SettingsMenu />
        </View>
      </View>

      {/* ── Filter row ─────────────────────────────────────────────── */}
      <View style={styles.filterRow}>
        <ReasonChips />
        <ReasonCount />
      </View>

      {/* ── Banners ────────────────────────────────────────────────── */}
      <RetryBanner />
      <TileFallbackBanner hasTileError={hasTileError} />

      {/* ── Map ────────────────────────────────────────────────────── */}
      <View style={styles.mapContainer}>
        <MapWebView
          ref={mapRef}
          onPinTap={handlePinTap}
          onTileError={handleTileError}
          backgroundColor={colors.slate50}
        />
      </View>

      {/* ── Bottom card strip ──────────────────────────────────────── */}
      <View style={styles.cardStrip}>
        <BottomCardStrip ref={cardRef} rows={filteredRows} />
      </View>

      {/* ── Detail sheet (Modal) ───────────────────────────────────── */}
      <MobileDetailSheet hub={hub} />
    </SafeAreaView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  mapContainer: {
    height: MAP_HEIGHT,
  },
  cardStrip: {
    height: CARD_STRIP_HEIGHT,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    backgroundColor: colors.slate50,
  },
});
