// Smoke test for RetryBanner — matches the existing import-shape pattern
// (no React rendering, since the jest env is node without @testing-library/rn).

jest.mock('../src/store/fetchWeather', () => ({
  __esModule: true,
  FETCH_CONCURRENCY: 8,
  fetchWeather: jest.fn(async () => {}),
}));

import { RetryBanner } from '../src/components/RetryBanner';
import { useStore } from '../src/store';
import { selectAnyFailed } from '../src/store/selectors';

beforeEach(() => {
  useStore.getState()._abortController?.abort();
  useStore.setState({
    failedIds: new Set<string>(),
    retrying: false,
    weatherByDest: {},
    fetchEpoch: 0,
    selectedHubId: 'seattle',
    _abortController: null,
  });
});

afterAll(() => {
  useStore.getState()._abortController?.abort();
});

describe('RetryBanner — module shape', () => {
  it('exports a named React component', () => {
    expect(typeof RetryBanner).toBe('function');
  });

  it('selectAnyFailed returns false when no failures', () => {
    expect(selectAnyFailed(useStore.getState())).toBe(false);
  });

  it('selectAnyFailed returns true when failedIds is non-empty', () => {
    useStore.setState({ failedIds: new Set(['a']) });
    expect(selectAnyFailed(useStore.getState())).toBe(true);
  });

  it('retryFailed action exists', () => {
    expect(typeof useStore.getState().retryFailed).toBe('function');
  });

  it('failedIds.size singular vs plural — store yields raw count for label derivation', () => {
    useStore.setState({ failedIds: new Set(['a']) });
    expect(useStore.getState().failedIds.size).toBe(1);
    useStore.setState({ failedIds: new Set(['a', 'b', 'c']) });
    expect(useStore.getState().failedIds.size).toBe(3);
  });
});
