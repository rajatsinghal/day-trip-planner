// Smoke test: race protection in the Zustand store.
//
// Fires a fetch for hub A (slow mocked NWS), switches to hub B before any
// results return, then asserts hub-A results are dropped — weatherByDest
// for hub-A destination IDs remains empty after the switch.
//
// The race protection lives in setWeatherForDest: if the epoch passed to
// the function does not match store.fetchEpoch, the write is silently dropped.

// Mock fetchWeather so setHub() does NOT spawn real NWS workers. Without
// this, jest workers leak network calls past the test boundary and log
// "Cannot log after tests are done" warnings.
jest.mock('../src/store/fetchWeather', () => ({
  __esModule: true,
  FETCH_CONCURRENCY: 8,
  fetchWeather: jest.fn(async () => {}),
}));

import { useStore } from '../src/store/index';

// Reset store between tests AND abort any in-flight controller from prior tests.
beforeEach(() => {
  useStore.getState()._abortController?.abort();
  useStore.setState({
    selectedHubId: 'seattle',
    weatherByDest: {},
    failedIds: new Set<string>(),
    loading: false,
    retrying: false,
    fetchEpoch: 0,
    selectedId: null,
    detailId: null,
    _abortController: null,
  });
});

afterAll(() => {
  // Final cleanup: abort any controller still pending.
  useStore.getState()._abortController?.abort();
});

describe('race protection: setWeatherForDest epoch check', () => {
  it('accepts a write whose epoch matches fetchEpoch', () => {
    const store = useStore.getState();
    const currentEpoch = store.fetchEpoch; // 0

    store.setWeatherForDest('dest-a', {
      hourly: {
        time: [],
        temperature_2m: [],
        precipitation_probability: [],
        precipitation: [],
        wind_speed_10m: [],
        weather_code: [],
      },
      fetchedAt: Date.now(),
    }, currentEpoch);

    expect(useStore.getState().weatherByDest['dest-a']).toBeDefined();
  });

  it('drops a write whose epoch is stale (hub switched)', () => {
    const store = useStore.getState();
    const oldEpoch = store.fetchEpoch; // 0

    // Simulate a hub switch: epoch increments and weatherByDest is cleared.
    useStore.setState({
      fetchEpoch: oldEpoch + 1,
      weatherByDest: {},
      selectedHubId: 'austin',
    });

    // Now try to write with the old epoch — this must be a no-op.
    useStore.getState().setWeatherForDest('dest-from-hubA', {
      hourly: {
        time: [],
        temperature_2m: [],
        precipitation_probability: [],
        precipitation: [],
        wind_speed_10m: [],
        weather_code: [],
      },
      fetchedAt: Date.now(),
    }, oldEpoch);

    // fetchEpoch advanced → the write must have been rejected.
    expect(useStore.getState().weatherByDest['dest-from-hubA']).toBeUndefined();
  });
});

describe('hub switch (setHub action) increments fetchEpoch and clears state', () => {
  it('bumps fetchEpoch on setHub', () => {
    const before = useStore.getState().fetchEpoch;

    // Call setHub directly — this is the same action Phase 4 will call.
    // We mock the dynamic import to avoid triggering real fetches.
    // The epoch increment happens synchronously in setHub.
    const originalImport = (global as { dtpMockImport?: unknown }).dtpMockImport;

    // Patch dynamic import (fetchWeather is called via dynamic import in setHub).
    // The test environment will simply swallow the unresolved import without
    // affecting the synchronous state mutation we're asserting.
    useStore.getState().setHub('austin');

    const after = useStore.getState().fetchEpoch;
    expect(after).toBe(before + 1);
    expect(useStore.getState().selectedHubId).toBe('austin');
    expect(Object.keys(useStore.getState().weatherByDest)).toHaveLength(0);

    void originalImport; // suppress unused
  });

  it('clears failedIds on setHub', () => {
    // Pre-populate failedIds.
    useStore.setState({ failedIds: new Set(['dest-x', 'dest-y']) });

    useStore.getState().setHub('seattle');

    expect(useStore.getState().failedIds.size).toBe(0);
  });

  it('clears selectedId on setHub', () => {
    useStore.setState({ selectedId: 'some-dest' });

    useStore.getState().setHub('denver');

    // selectedId should be cleared on hub switch.
    expect(useStore.getState().selectedId).toBeNull();
  });
});

describe('atomic epoch check: write dropped when epoch goes stale between read and write', () => {
  it('drops write when epoch becomes stale between read and write', () => {
    const store = useStore.getState();
    store.setHub('seattle');
    const epoch = useStore.getState().fetchEpoch;

    // Simulate: another setHub fires between epoch capture and the write.
    store.setHub('austin');

    // Now write with the old epoch — must be a no-op because epoch is stale.
    store.setWeatherForDest('some-id', {
      hourly: {
        time: [],
        temperature_2m: [],
        precipitation_probability: [],
        precipitation: [],
        wind_speed_10m: [],
        weather_code: [],
      },
      fetchedAt: Date.now(),
    }, epoch);

    expect(useStore.getState().weatherByDest['some-id']).toBeUndefined();
  });
});

describe('epoch-based drop: end-to-end simulation', () => {
  it('simulates hub A fetch landing after hub B switch — drops hub A result', () => {
    // Arrange: epoch 1 = hub A, epoch 2 = hub B.
    const epochA = 1;
    const epochB = 2;

    // Set store to epoch B (hub B is now active).
    useStore.setState({
      fetchEpoch: epochB,
      selectedHubId: 'bay-area',
      weatherByDest: {},
    });

    const fakeWeather = {
      hourly: {
        time: ['2024-06-01T10:00'],
        temperature_2m: [20],
        precipitation_probability: [0],
        precipitation: [0],
        wind_speed_10m: [10],
        weather_code: [0],
      },
      fetchedAt: Date.now(),
    };

    // Hub A's slow result arrives, still tagged with epochA.
    useStore.getState().setWeatherForDest('hub-a-dest-id', fakeWeather, epochA);

    // fetchEpoch is now B; the write with epochA must be rejected.
    expect(useStore.getState().weatherByDest['hub-a-dest-id']).toBeUndefined();

    // Hub B result arrives tagged with epochB — must be accepted.
    useStore.getState().setWeatherForDest('hub-b-dest-id', fakeWeather, epochB);
    expect(useStore.getState().weatherByDest['hub-b-dest-id']).toBeDefined();
  });
});
