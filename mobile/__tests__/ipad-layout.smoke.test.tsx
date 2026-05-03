// Smoke test for Phase 4b iPad layout.
//
// Pattern: module-shape tests (no rendering) + predicate logic tests.
// The shouldUseIPadLayout predicate is extracted and exported from
// MainScreenIPad so it can be tested without mounting any React tree.
//
// All native module transitive imports are mocked here so Jest can import
// the screen and panel modules in the node test environment.

// ── fetchWeather mock ────────────────────────────────────────────────────────
jest.mock('../src/store/fetchWeather', () => ({
  __esModule: true,
  FETCH_CONCURRENCY: 8,
  fetchWeather: jest.fn(async () => {}),
}));

// ── react-native mock (override the global mock for this test file) ──────────
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    isPad: false,
    select: (obj: Record<string, unknown>) => obj.ios ?? obj.default,
  },
  NativeModules: {},
  AppState: {
    currentState: 'active',
    addEventListener: () => ({ remove: () => {} }),
  },
  Animated: {
    View: 'Animated.View',
    Text: 'Animated.Text',
    Value: class { constructor(public _v: number) {} setValue(v: number) { this._v = v; } },
    timing: () => ({ start: (cb?: () => void) => { if (cb) cb(); } }),
    spring: () => ({ start: (cb?: () => void) => { if (cb) cb(); } }),
    createAnimatedComponent: <T,>(c: T) => c,
  },
  Dimensions: {
    get: () => ({ width: 1024, height: 768 }),
    addEventListener: () => ({ remove: () => {} }),
  },
  Linking: {
    openURL: async () => true,
    canOpenURL: async () => true,
  },
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    flatten: (style: unknown) => style,
    hairlineWidth: 1,
  },
  useWindowDimensions: () => ({ width: 1024, height: 768 }),
  PixelRatio: { get: () => 2, getFontScale: () => 1, roundToNearestPixel: (n: number) => Math.round(n) },
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Modal: 'Modal',
  SafeAreaView: 'SafeAreaView',
  FlatList: 'FlatList',
}));

// ── react-native-safe-area-context mock ──────────────────────────────────────
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaProvider: 'SafeAreaProvider',
}));

// ── react-native-webview mock ─────────────────────────────────────────────────
jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
  default: 'WebView',
}));

// ── @miblanchard/react-native-slider mock ────────────────────────────────────
jest.mock('@miblanchard/react-native-slider', () => ({
  Slider: 'Slider',
}));

// ── react-native-svg mock ─────────────────────────────────────────────────────
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Path: 'Path',
  G: 'G',
  Circle: 'Circle',
  Rect: 'Rect',
  default: 'Svg',
}));

// ── expo-status-bar mock ──────────────────────────────────────────────────────
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// ── imports (after all mocks are registered) ─────────────────────────────────
import MainScreenIPad, { shouldUseIPadLayout } from '../src/screens/MainScreenIPad';
import { IPadDetailPanel } from '../src/components/IPadDetailPanel';

// ── Module shape tests ────────────────────────────────────────────────────────

describe('MainScreenIPad — module shape', () => {
  it('is exported as a function (React component)', () => {
    expect(typeof MainScreenIPad).toBe('function');
  });

  it('exports shouldUseIPadLayout as a named function', () => {
    expect(typeof shouldUseIPadLayout).toBe('function');
  });
});

describe('IPadDetailPanel — module shape', () => {
  it('is exported as a function (React component)', () => {
    expect(typeof IPadDetailPanel).toBe('function');
  });
});

// ── Layout decision logic (two-pane vs phone fallback) ────────────────────────
// These test the shouldUseIPadLayout(width, isIPad) predicate directly.
// Two-pane shape: iPad + width ≥ 600pt → MainScreenIPad.
// Phone fallback shape: non-iPad, or iPad + width < 600pt → MainScreenPhone.

describe('shouldUseIPadLayout — two-pane predicate', () => {
  it('returns true for iPad at 1024pt width (landscape)', () => {
    // two-pane shape: wide iPad landscape should use MainScreenIPad
    expect(shouldUseIPadLayout(1024, true)).toBe(true);
  });

  it('returns true for iPad at 768pt width (portrait)', () => {
    // two-pane shape: standard iPad portrait is still two-pane
    expect(shouldUseIPadLayout(768, true)).toBe(true);
  });

  it('returns true for iPad at exactly 600pt (minimum wide threshold)', () => {
    expect(shouldUseIPadLayout(600, true)).toBe(true);
  });

  it('returns false for iPad at 480pt width (phone fallback — Slide Over)', () => {
    // phone fallback shape: narrow Slide Over should fall back to MainScreenPhone
    expect(shouldUseIPadLayout(480, true)).toBe(false);
  });

  it('returns false for iPad at 599pt (just below 600pt threshold)', () => {
    expect(shouldUseIPadLayout(599, true)).toBe(false);
  });

  it('returns false when isIPad is false (phone device at 1024pt)', () => {
    // Not an iPad — even at wide width, do not use iPad layout.
    expect(shouldUseIPadLayout(1024, false)).toBe(false);
  });

  it('returns false for phone at 480pt', () => {
    expect(shouldUseIPadLayout(480, false)).toBe(false);
  });
});

// ── App.tsx layout switch alignment ──────────────────────────────────────────
// Verify the predicate matches what App.tsx expects (isIPad && width >= 600).

describe('shouldUseIPadLayout — MainScreenIPad expect boundary conditions', () => {
  it('two-pane: iPad + wide returns true', () => {
    const result = shouldUseIPadLayout(1024, true);
    expect(result).toBe(true);
  });

  it('phone fallback: iPad + narrow returns false', () => {
    const result = shouldUseIPadLayout(480, true);
    expect(result).toBe(false);
  });
});
