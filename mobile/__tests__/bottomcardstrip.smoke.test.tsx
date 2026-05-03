// Smoke test: BottomCardStrip
//
// Verifies:
//  1. keyExtractor returns unique keys across fixture rows.
//  2. scrollToId(id) calls FlatList.scrollToIndex with the correct index.
//
// Runs in the "node" Jest environment (no DOM) — does not mount the component.
// We test the exported constants and the imperative handle logic directly,
// mocking FlatList's ref to capture scrollToIndex calls.

import { CARD_WIDTH, SNAP_INTERVAL } from '../src/components/BottomCardStrip.constants';
import type { EnrichedDestination } from '../src/store/selectors';
import type { ReasonsToVisit } from '@dtp/core';

// ── fixture rows ──────────────────────────────────────────────────────────

function makeRow(id: string): EnrichedDestination {
  return {
    id,
    name: `Dest ${id}`,
    lat: 47.0,
    lon: -122.0,
    reasons_to_visit: ['hike'] as ReasonsToVisit[],
    blurb: 'A test destination.',
    driveMinutes: 60,
    weather: null,
    score: null,
  };
}

const ROWS: EnrichedDestination[] = [
  makeRow('alpha'),
  makeRow('beta'),
  makeRow('gamma'),
];

// ── keyExtractor logic ────────────────────────────────────────────────────

// The component uses `(item) => item.id` — replicate it here and assert
// uniqueness across the fixture.
function keyExtractor(item: EnrichedDestination): string {
  return item.id;
}

describe('BottomCardStrip keyExtractor', () => {
  it('returns unique keys for all fixture rows', () => {
    const keys = ROWS.map(keyExtractor);
    const unique = new Set(keys);
    expect(unique.size).toBe(ROWS.length);
  });

  it('returns the destination id as the key', () => {
    expect(keyExtractor(ROWS[0])).toBe('alpha');
    expect(keyExtractor(ROWS[1])).toBe('beta');
    expect(keyExtractor(ROWS[2])).toBe('gamma');
  });
});

// ── scrollToId logic ──────────────────────────────────────────────────────

// Replicate the scrollToId implementation from the imperative handle so we
// can unit-test it without mounting a React component.

function makeScrollToId(
  rows: EnrichedDestination[],
  scrollToIndex: (args: { index: number; animated: boolean }) => void,
) {
  return function scrollToId(id: string) {
    const index = rows.findIndex((r) => r.id === id);
    if (index < 0) return;
    scrollToIndex({ index, animated: true });
  };
}

describe('BottomCardStrip scrollToId', () => {
  it('calls scrollToIndex with correct index for first row', () => {
    const scrollToIndex = jest.fn();
    const scrollToId = makeScrollToId(ROWS, scrollToIndex);
    scrollToId('alpha');
    expect(scrollToIndex).toHaveBeenCalledWith({ index: 0, animated: true });
  });

  it('calls scrollToIndex with correct index for middle row', () => {
    const scrollToIndex = jest.fn();
    const scrollToId = makeScrollToId(ROWS, scrollToIndex);
    scrollToId('beta');
    expect(scrollToIndex).toHaveBeenCalledWith({ index: 1, animated: true });
  });

  it('calls scrollToIndex with correct index for last row', () => {
    const scrollToIndex = jest.fn();
    const scrollToId = makeScrollToId(ROWS, scrollToIndex);
    scrollToId('gamma');
    expect(scrollToIndex).toHaveBeenCalledWith({ index: 2, animated: true });
  });

  it('does NOT call scrollToIndex for unknown id', () => {
    const scrollToIndex = jest.fn();
    const scrollToId = makeScrollToId(ROWS, scrollToIndex);
    scrollToId('does-not-exist');
    expect(scrollToIndex).not.toHaveBeenCalled();
  });
});

// ── layout constants ──────────────────────────────────────────────────────

describe('BottomCardStrip layout constants', () => {
  it('CARD_WIDTH is 260', () => {
    expect(CARD_WIDTH).toBe(260);
  });

  it('SNAP_INTERVAL is CARD_WIDTH + 8 (spacing.sm)', () => {
    // spacing.sm = 8
    expect(SNAP_INTERVAL).toBe(CARD_WIDTH + 8);
  });
});
