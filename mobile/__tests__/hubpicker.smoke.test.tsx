// Smoke test for HubPicker — module-shape pattern (no React rendering).

jest.mock('../src/store/fetchWeather', () => ({
  __esModule: true,
  FETCH_CONCURRENCY: 8,
  fetchWeather: jest.fn(async () => {}),
}));

import { HubPicker } from '../src/components/HubPicker';
import { useStore } from '../src/store';
import { HUBS } from '@dtp/core';

beforeEach(() => {
  useStore.getState()._abortController?.abort();
  useStore.setState({
    selectedHubId: 'seattle',
    weatherByDest: {},
    failedIds: new Set<string>(),
    fetchEpoch: 0,
    _abortController: null,
  });
});

afterAll(() => {
  useStore.getState()._abortController?.abort();
});

describe('HubPicker — module shape', () => {
  it('exports a named React component', () => {
    expect(typeof HubPicker).toBe('function');
  });

  it('HUBS list has at least 7 hubs (per the v1 catalog)', () => {
    expect(HUBS.length).toBeGreaterThanOrEqual(7);
  });

  it('every hub has id and name', () => {
    for (const hub of HUBS) {
      expect(typeof hub.id).toBe('string');
      expect(typeof hub.name).toBe('string');
    }
  });

  it('seattle is in the catalog and is the default in the test fixture', () => {
    expect(HUBS.some((h) => h.id === 'seattle')).toBe(true);
    expect(useStore.getState().selectedHubId).toBe('seattle');
  });

  it('setHub action exists and updates selectedHubId', () => {
    const setHub = useStore.getState().setHub;
    expect(typeof setHub).toBe('function');
    setHub('austin');
    expect(useStore.getState().selectedHubId).toBe('austin');
  });
});
