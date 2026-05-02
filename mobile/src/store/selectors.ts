// FROZEN as of Phase 2.5 — modifications require a Phase 2.5 amendment.
//
// Derived selectors for the DTP Zustand store.
// Each selector is a plain function — callers wrap in useStore(s => select…(s))
// and may use useShallow from 'zustand/react/shallow' for object stability.
//
// Selector signatures take (state, hub) rather than just (state) so that
// callers can pass the resolved hub without storing it inside the store.

import { memoize } from 'proxy-memoize';
import {
  aggregateHourlyToDaily,
  scoreWeather,
  haversineKm,
  estimateDriveMinutes,
  type DailyWeather,
  type WeatherResponse,
  type Hub,
  type Destination,
  type ReasonsToVisit,
} from '@dtp/core';
import type { MapPin } from '../map/bridge-protocol';
import type { DTPState } from './index';

// ── types ─────────────────────────────────────────────────────────────────

export interface EnrichedDestination extends Destination {
  driveMinutes: number;
  weather: DailyWeather | null;
  score: number | null;
}

// ── window clamp constants (mirrors web App.tsx) ──────────────────────────

const WINDOW_MIN_HOUR = 4;
const WINDOW_MAX_HOUR = 22;

// ── selectDisplayWindow ───────────────────────────────────────────────────

/**
 * Derives [displayWindowStart, displayWindowEnd] from windowHours + selectedDay.
 * When selectedDay is today, clamps start to current-hour-or-later.
 * Mirrors web App.tsx lines 277-284.
 */
export function selectDisplayWindow(
  state: Pick<DTPState, 'windowHours' | 'selectedDay'>,
): [number, number] {
  const { windowHours, selectedDay } = state;

  const now = new Date();
  const todayIso = toIsoDate(now);
  const isToday = selectedDay === todayIso;
  const currentHour = now.getHours();

  const effectiveWindowMin = isToday
    ? Math.min(WINDOW_MAX_HOUR - 1, Math.max(WINDOW_MIN_HOUR, currentHour))
    : WINDOW_MIN_HOUR;

  const displayWindowStart = Math.max(windowHours[0], effectiveWindowMin);
  const displayWindowEnd = Math.max(windowHours[1], displayWindowStart + 1);

  return [displayWindowStart, displayWindowEnd];
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── selectEnrichedRows ────────────────────────────────────────────────────

type EnrichedArgs = { state: Pick<DTPState, 'weatherByDest' | 'selectedDay' | 'windowHours'>; hub: Hub };

const _enrichedMemo = memoize<EnrichedArgs, EnrichedDestination[]>(({ state, hub }) => {
  const [startHour, endHour] = selectDisplayWindow(state);

  const enriched: EnrichedDestination[] = hub.destinations.map((d) => {
    const distanceKm = haversineKm(hub.center, d);
    const driveMinutes = estimateDriveMinutes(distanceKm);
    const wx: WeatherResponse | undefined = state.weatherByDest[d.id];
    const days = wx ? aggregateHourlyToDaily(wx.hourly, startHour, endHour) : null;
    const day = days?.find((x) => x.isoDate === state.selectedDay) ?? null;
    const score = day ? scoreWeather(day) : null;
    return { ...d, driveMinutes, weather: day, score };
  });

  enriched.sort((a, b) => {
    if (a.score === null && b.score === null) return a.driveMinutes - b.driveMinutes;
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    if (b.score !== a.score) return b.score - a.score;
    return a.driveMinutes - b.driveMinutes;
  });

  return enriched;
});

/**
 * Enriches every destination in hub.destinations with driveMinutes, weather,
 * and score, then sorts: highest score first, no-weather to bottom,
 * drive time ascending as a tiebreaker.
 * Mirrors web App.tsx line 286 `rows` memo.
 */
export function selectEnrichedRows(
  state: Pick<DTPState, 'weatherByDest' | 'selectedDay' | 'windowHours'>,
  hub: Hub,
): EnrichedDestination[] {
  return _enrichedMemo({ state, hub });
}

// ── selectFilteredRows ────────────────────────────────────────────────────

type FilteredArgs = { state: Pick<DTPState, 'weatherByDest' | 'selectedDay' | 'windowHours' | 'selectedReasons'>; hub: Hub };

const _filteredMemo = memoize<FilteredArgs, EnrichedDestination[]>(({ state, hub }) => {
  const rows = selectEnrichedRows(state, hub);
  if (state.selectedReasons.length === 0) return rows;
  const reasonSet = new Set<ReasonsToVisit>(state.selectedReasons);
  return rows.filter((r) => r.reasons_to_visit.some((x) => reasonSet.has(x)));
});

/**
 * Applies the selectedReasons filter on top of selectEnrichedRows.
 * If no reasons are selected, returns all rows.
 * Mirrors web App.tsx line 308 `filteredRows` memo.
 */
export function selectFilteredRows(
  state: Pick<DTPState, 'weatherByDest' | 'selectedDay' | 'windowHours' | 'selectedReasons'>,
  hub: Hub,
): EnrichedDestination[] {
  return _filteredMemo({ state, hub });
}

// ── selectMapPins ─────────────────────────────────────────────────────────

type MapPinsArgs = { state: Pick<DTPState, 'weatherByDest' | 'selectedDay' | 'windowHours' | 'selectedReasons' | 'selectedId'>; hub: Hub };

const _mapPinsMemo = memoize<MapPinsArgs, MapPin[]>(({ state, hub }) => {
  const rows = selectFilteredRows(state, hub);

  return rows.map((row) => {
    const hasWeather = row.weather !== null;
    const isSelected = state.selectedId === row.id;

    let iconImage: string;
    if (!hasWeather) {
      iconImage = 'pin-loading';
    } else {
      const sprite = weatherCodeToSprite(row.weather!.weatherCode);
      iconImage = isSelected ? `${sprite}-selected` : sprite;
    }

    return {
      id: row.id,
      lat: row.lat,
      lon: row.lon,
      iconImage,
      selected: isSelected,
      loading: !hasWeather,
    };
  });
});

/**
 * Derives MapPin[] for the WebView from filtered rows.
 * Pin sprite key logic:
 *   - No weather yet → 'pin-loading'
 *   - Has weather → 'pin-<weatherLabel>' where label is one of:
 *     clear, sunny, partly-cloudy, cloudy, foggy, drizzle, rainy, snowy,
 *     showers, thunderstorm
 *   - selectedId match → append '-selected' suffix
 * Mirrors the web Map.tsx pin-icon naming convention.
 */
export function selectMapPins(
  state: Pick<DTPState, 'weatherByDest' | 'selectedDay' | 'windowHours' | 'selectedReasons' | 'selectedId'>,
  hub: Hub,
): MapPin[] {
  return _mapPinsMemo({ state, hub });
}

/** Maps a WMO weather code to a sprite key (no '-selected' suffix). */
function weatherCodeToSprite(code: number): string {
  if (code === 0) return 'pin-clear';
  if (code === 1) return 'pin-sunny';
  if (code === 2) return 'pin-partly-cloudy';
  if (code === 3) return 'pin-cloudy';
  if (code >= 45 && code <= 48) return 'pin-foggy';
  if (code >= 51 && code <= 57) return 'pin-drizzle';
  if (code >= 61 && code <= 67) return 'pin-rainy';
  if (code >= 71 && code <= 77) return 'pin-snowy';
  if (code >= 80 && code <= 82) return 'pin-showers';
  if (code >= 85 && code <= 86) return 'pin-snowy';
  if (code >= 95) return 'pin-thunderstorm';
  return 'pin-cloudy';
}

// ── selectAnyFailed ───────────────────────────────────────────────────────

/**
 * True iff any destination fetch has failed (retry banner should be shown).
 */
export function selectAnyFailed(state: Pick<DTPState, 'failedIds'>): boolean {
  return state.failedIds.size > 0;
}
