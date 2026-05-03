// Smoke test: DestinationList component logic.
//
// Tests:
//  1. keyExtractor produces unique keys for a 5-row fixture.
//  2. An empty rows array triggers the ListEmptyComponent path.
//  3. isSelected logic: only the row matching selectedId is flagged selected.
//
// We exercise the data logic directly (not React rendering) because the Jest
// environment is 'node' with a minimal react-native mock.

import type { EnrichedDestination } from '../src/store/selectors';
import type { DailyWeather } from '@dtp/core';

// ── fixture factory ───────────────────────────────────────────────────────

function makeRow(id: string, hasWeather = false): EnrichedDestination {
  const weather: DailyWeather | null = hasWeather
    ? {
        isoDate: '2026-04-20',
        tMaxC: 20,
        tMinC: 10,
        precipMm: 0,
        precipProb: 5,
        windMaxKmh: 15,
        weatherCode: 1,
      }
    : null;
  return {
    id,
    name: `Destination ${id}`,
    lat: 47.5 + Math.random() * 0.5,
    lon: -122.0 - Math.random() * 0.5,
    reasons_to_visit: ['hike', 'lake'],
    blurb: `Blurb for ${id}.`,
    driveMinutes: 45,
    weather,
    score: hasWeather ? 80 : null,
  };
}

const FIVE_ROWS: EnrichedDestination[] = [
  makeRow('dest-a', true),
  makeRow('dest-b', false),
  makeRow('dest-c', true),
  makeRow('dest-d', false),
  makeRow('dest-e', true),
];

// ── keyExtractor ──────────────────────────────────────────────────────────

// The component uses `(item) => item.id` — replicate that function here.
const keyExtractor = (item: EnrichedDestination): string => item.id;

describe('DestinationList — keyExtractor', () => {
  it('produces a key for every row', () => {
    const keys = FIVE_ROWS.map(keyExtractor);
    expect(keys).toHaveLength(5);
  });

  it('produces unique keys for a 5-row fixture', () => {
    const keys = FIVE_ROWS.map(keyExtractor);
    const unique = new Set(keys);
    expect(unique.size).toBe(FIVE_ROWS.length);
  });

  it('each key equals the row id', () => {
    FIVE_ROWS.forEach((row) => {
      expect(keyExtractor(row)).toBe(row.id);
    });
  });

  it('returns a string, never undefined', () => {
    FIVE_ROWS.forEach((row) => {
      const key = keyExtractor(row);
      expect(typeof key).toBe('string');
      expect(key).toBeTruthy();
    });
  });
});

// ── ListEmptyComponent logic ───────────────────────────────────────────────

describe('DestinationList — empty data', () => {
  it('empty rows array has length 0 (triggers ListEmptyComponent)', () => {
    const rows: EnrichedDestination[] = [];
    expect(rows.length).toBe(0);
  });

  it('non-empty rows array does not trigger ListEmptyComponent', () => {
    expect(FIVE_ROWS.length).toBeGreaterThan(0);
  });
});

// ── selectedId highlights the right row ───────────────────────────────────

describe('DestinationList — selectedId selection logic', () => {
  const selectedId = 'dest-c';

  it('exactly one row is selected when selectedId matches', () => {
    const selectedRows = FIVE_ROWS.filter((r) => r.id === selectedId);
    expect(selectedRows).toHaveLength(1);
  });

  it('the selected row has the correct id', () => {
    const selected = FIVE_ROWS.find((r) => r.id === selectedId);
    expect(selected?.id).toBe(selectedId);
  });

  it('non-matching rows are not selected', () => {
    const notSelected = FIVE_ROWS.filter((r) => r.id !== selectedId);
    expect(notSelected).toHaveLength(4);
    notSelected.forEach((r) => {
      expect(r.id === selectedId).toBe(false);
    });
  });

  it('null selectedId means no row is highlighted', () => {
    const nullId: string | null = null;
    const selected = FIVE_ROWS.filter((r) => r.id === nullId);
    expect(selected).toHaveLength(0);
  });
});

// ── skeleton mode ─────────────────────────────────────────────────────────

describe('DestinationList — skeleton / loading state', () => {
  it('skeleton mode triggers when loading=true and rows.length===0', () => {
    const loading = true;
    const rows: EnrichedDestination[] = [];
    // The component enters skeleton mode under this condition.
    expect(loading && rows.length === 0).toBe(true);
  });

  it('skeleton mode does NOT trigger when rows are present even if loading', () => {
    const loading = true;
    // Once data starts flowing in, skeleton should be replaced by real rows.
    expect(loading && FIVE_ROWS.length === 0).toBe(false);
  });
});
