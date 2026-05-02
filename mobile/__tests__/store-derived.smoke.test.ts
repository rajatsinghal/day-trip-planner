// Smoke test: derived selectors selectEnrichedRows, selectFilteredRows,
// selectDisplayWindow.
//
// Uses a small fixture: 3 destinations (2 with weather at different scores,
// 1 with no weather). Applies a reason filter. Asserts ordering and filter.

import {
  selectEnrichedRows,
  selectFilteredRows,
  selectDisplayWindow,
} from '../src/store/selectors';
import type { Hub, WeatherResponse, ReasonsToVisit } from '@dtp/core';

// ── fixture hub ───────────────────────────────────────────────────────────

const FIXTURE_HUB: Hub = {
  id: 'test-hub',
  name: 'Test Hub',
  center: { name: 'Test City, TS', lat: 47.0, lon: -122.0 },
  destinations: [
    {
      id: 'dest-close-bad-weather',
      name: 'Close Bad Weather',
      lat: 47.5,
      lon: -122.0,
      reasons_to_visit: ['lake', 'hike'],
      blurb: 'Close destination with poor weather.',
    },
    {
      id: 'dest-far-good-weather',
      name: 'Far Good Weather',
      lat: 48.5,
      lon: -122.0,
      reasons_to_visit: ['hike', 'viewpoint'],
      blurb: 'Far destination with excellent weather.',
    },
    {
      id: 'dest-no-weather',
      name: 'No Weather Yet',
      lat: 47.2,
      lon: -122.5,
      reasons_to_visit: ['town'],
      blurb: 'No weather data yet.',
    },
  ],
};

// ── fixture weather ───────────────────────────────────────────────────────

function makeHourlyWeather(weatherCode: number, tempC: number): WeatherResponse {
  // Populate 6 hours (10:00–15:00) for 2026-04-20.
  const times: string[] = [];
  const temps: number[] = [];
  const precip: number[] = [];
  const precipProb: number[] = [];
  const wind: number[] = [];
  const codes: number[] = [];
  for (let h = 10; h < 16; h++) {
    times.push(`2026-04-20T${String(h).padStart(2, '0')}:00`);
    temps.push(tempC);
    precip.push(0);
    precipProb.push(0);
    wind.push(10);
    codes.push(weatherCode);
  }
  return {
    hourly: {
      time: times,
      temperature_2m: temps,
      precipitation_probability: precipProb,
      precipitation: precip,
      wind_speed_10m: wind,
      weather_code: codes,
    },
    fetchedAt: Date.now(),
  };
}

// Close destination: overcast (code 3) at 18 °C → score ~38 (medium-low)
const WEATHER_CLOSE = makeHourlyWeather(3, 18);
// Far destination: clear (code 0) at 22 °C → score ~95 (high)
const WEATHER_FAR = makeHourlyWeather(0, 22);

// ── shared state fixture ──────────────────────────────────────────────────

const BASE_STATE = {
  weatherByDest: {
    'dest-close-bad-weather': WEATHER_CLOSE,
    'dest-far-good-weather': WEATHER_FAR,
    // 'dest-no-weather' intentionally absent
  },
  selectedDay: '2026-04-20',
  windowHours: [10, 16] as [number, number],
  selectedReasons: [] as ReasonsToVisit[],
};

// ── tests ─────────────────────────────────────────────────────────────────

describe('selectDisplayWindow', () => {
  it('returns user window unchanged for a future date', () => {
    const state = { windowHours: [10, 16] as [number, number], selectedDay: '2099-01-01' };
    const [start, end] = selectDisplayWindow(state);
    // Future date → no today-clamp → raw window is returned.
    expect(start).toBe(10);
    expect(end).toBe(16);
  });

  it('clamps start to current hour when selectedDay is today', () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const state = { windowHours: [0, 4] as [number, number], selectedDay: todayIso };
    const [start] = selectDisplayWindow(state);
    // Start must be at least currentHour (and at most WINDOW_MAX_HOUR - 1).
    const currentHour = new Date().getHours();
    expect(start).toBeGreaterThanOrEqual(Math.min(currentHour, 21));
  });
});

describe('selectEnrichedRows', () => {
  it('places no-weather destination last', () => {
    const rows = selectEnrichedRows(BASE_STATE, FIXTURE_HUB);
    const last = rows[rows.length - 1];
    expect(last.id).toBe('dest-no-weather');
    expect(last.score).toBeNull();
  });

  it('ranks higher-score destination before lower-score', () => {
    const rows = selectEnrichedRows(BASE_STATE, FIXTURE_HUB);
    const farIdx = rows.findIndex((r) => r.id === 'dest-far-good-weather');
    const closeIdx = rows.findIndex((r) => r.id === 'dest-close-bad-weather');
    // Far destination has clear sky (score ~95) > overcast (score ~38).
    expect(farIdx).toBeLessThan(closeIdx);
  });

  it('attaches driveMinutes for every destination', () => {
    const rows = selectEnrichedRows(BASE_STATE, FIXTURE_HUB);
    for (const row of rows) {
      expect(typeof row.driveMinutes).toBe('number');
      expect(row.driveMinutes).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('selectFilteredRows', () => {
  it('returns all rows when selectedReasons is empty', () => {
    const state = { ...BASE_STATE, selectedReasons: [] as ReasonsToVisit[] };
    const rows = selectFilteredRows(state, FIXTURE_HUB);
    // All 3 destinations should be present.
    expect(rows).toHaveLength(3);
  });

  it('filters to destinations matching selected reasons', () => {
    // Filter to 'town' — only 'dest-no-weather' qualifies.
    const state = { ...BASE_STATE, selectedReasons: ['town'] as ReasonsToVisit[] };
    const filteredRows = selectFilteredRows(state, FIXTURE_HUB);
    expect(filteredRows).toHaveLength(1);
    expect(filteredRows[0].id).toBe('dest-no-weather');
  });

  it('selectFilteredRows respects ordering even after filter', () => {
    // Filter to 'hike' — two destinations qualify; far (good weather) should be first.
    const state = { ...BASE_STATE, selectedReasons: ['hike'] as ReasonsToVisit[] };
    const filteredRows = selectFilteredRows(state, FIXTURE_HUB);
    expect(filteredRows).toHaveLength(2);
    // Higher score first.
    expect(filteredRows[0].id).toBe('dest-far-good-weather');
    expect(filteredRows[1].id).toBe('dest-close-bad-weather');
  });

  it('selectEnrichedRows + selectFilteredRows produce consistent length relationship', () => {
    const state = { ...BASE_STATE, selectedReasons: ['hike'] as ReasonsToVisit[] };
    const all = selectEnrichedRows(state, FIXTURE_HUB);
    const filtered = selectFilteredRows(state, FIXTURE_HUB);
    // Filtered rows must be a subset of enriched rows.
    expect(filtered.length).toBeLessThanOrEqual(all.length);
    for (const row of filtered) {
      expect(all.some((r) => r.id === row.id)).toBe(true);
    }
  });
});
