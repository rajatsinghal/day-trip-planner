// Smoke test for MobileDetailSheet — module-shape pattern.

jest.mock('../src/store/fetchWeather', () => ({
  __esModule: true,
  FETCH_CONCURRENCY: 8,
  fetchWeather: jest.fn(async () => {}),
}));

import { MobileDetailSheet } from '../src/components/MobileDetailSheet';
import { useStore } from '../src/store';
import { HUBS } from '@dtp/core';

beforeEach(() => {
  useStore.getState()._abortController?.abort();
  useStore.setState({
    selectedHubId: 'seattle',
    detailId: null,
    weatherByDest: {},
    failedIds: new Set<string>(),
    fetchEpoch: 0,
    _abortController: null,
  });
});

afterAll(() => {
  useStore.getState()._abortController?.abort();
});

describe('MobileDetailSheet — module shape', () => {
  it('exports a named React component', () => {
    expect(typeof MobileDetailSheet).toBe('function');
  });

  it('detailId is null by default', () => {
    expect(useStore.getState().detailId).toBeNull();
  });

  it('setDetailId opens and closes the sheet via store state', () => {
    const setDetailId = useStore.getState().setDetailId;
    setDetailId('snoqualmie-falls');
    expect(useStore.getState().detailId).toBe('snoqualmie-falls');
    setDetailId(null);
    expect(useStore.getState().detailId).toBeNull();
  });

  it('seattle hub has destinations the sheet can resolve from detailId', () => {
    const seattle = HUBS.find((h) => h.id === 'seattle');
    expect(seattle).toBeDefined();
    expect(seattle!.destinations.length).toBeGreaterThan(0);
    const first = seattle!.destinations[0];
    expect(typeof first.id).toBe('string');
    expect(typeof first.name).toBe('string');
    expect(typeof first.lat).toBe('number');
    expect(typeof first.lon).toBe('number');
  });
});
