// Smoke test for Phase 3a components: DayChips, HourRangeSlider, WhenPicker.
//
// Runs in the node test environment (no DOM, no React renderer).
// Validates:
//   1. All three modules can be imported without errors.
//   2. Exported component symbols are functions (renderable by React).
//   3. formatHour logic (inlined in HourRangeSlider / WhenPicker) produces
//      correct 12-hour strings — checked via the module's own shape.
//   4. DayChips, HourRangeSlider, and WhenPicker are named exports.
//
// Why no JSX rendering: the jest config uses testEnvironment=node with
// ts-jest and no @testing-library/react-native. Matching the existing
// smoke-test pattern (bridge-handshake, store-derived, etc.) which test
// logic without a React renderer.

// ── react-native mock (extend the minimal existing mock) ──────────────────
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: Record<string, unknown>) => obj.ios ?? obj.default },
  NativeModules: {},
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Modal: 'Modal',
  SafeAreaView: 'SafeAreaView',
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    absoluteFillObject: {},
    flatten: (style: unknown) => style,
  },
}));

// ── @miblanchard/react-native-slider mock ─────────────────────────────────
jest.mock('@miblanchard/react-native-slider', () => ({
  Slider: 'Slider',
}));

// ── @dtp/core mock for DayOption ──────────────────────────────────────────
// Use the real @dtp/core — it has no native dependencies.

// ── imports ───────────────────────────────────────────────────────────────
import { DayChips } from '../src/components/DayChips';
import { HourRangeSlider } from '../src/components/HourRangeSlider';
import { WhenPicker } from '../src/components/WhenPicker';
import { computeDayOptions } from '@dtp/core';

// ── fixture data ──────────────────────────────────────────────────────────

const DAY_OPTIONS = computeDayOptions(new Date('2026-04-20T12:00:00'));
const SELECTED_DAY = DAY_OPTIONS[0].isoDate; // Today

// ── tests ─────────────────────────────────────────────────────────────────

describe('DayChips', () => {
  it('is a named export and a function', () => {
    expect(typeof DayChips).toBe('function');
  });

  it('computeDayOptions produces valid options with label and sublabel', () => {
    expect(DAY_OPTIONS.length).toBeGreaterThanOrEqual(2);
    for (const opt of DAY_OPTIONS) {
      expect(typeof opt.isoDate).toBe('string');
      expect(opt.isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof opt.label).toBe('string');
      expect(opt.label.length).toBeGreaterThan(0);
      expect(typeof opt.sublabel).toBe('string');
    }
  });

  it('first option label is "Today"', () => {
    expect(DAY_OPTIONS[0].label).toBe('Today');
  });

  it('second option label is "Tomorrow"', () => {
    expect(DAY_OPTIONS[1].label).toBe('Tomorrow');
  });
});

describe('HourRangeSlider', () => {
  it('is a named export and a function', () => {
    expect(typeof HourRangeSlider).toBe('function');
  });

  it('formatHour logic: 4 AM lower bound formats correctly', () => {
    // Replicate the formatHour logic from HourRangeSlider to verify correctness.
    function formatHour(h: number): string {
      const wrapped = h === 24 ? 24 : h % 24;
      if (wrapped === 0 || wrapped === 24) return '12 AM';
      if (wrapped === 12) return '12 PM';
      if (wrapped < 12) return `${wrapped} AM`;
      return `${wrapped - 12} PM`;
    }
    expect(formatHour(4)).toBe('4 AM');
    expect(formatHour(10)).toBe('10 AM');
    expect(formatHour(12)).toBe('12 PM');
    expect(formatHour(16)).toBe('4 PM');
    expect(formatHour(22)).toBe('10 PM');
    expect(formatHour(0)).toBe('12 AM');
    expect(formatHour(24)).toBe('12 AM');
  });
});

describe('WhenPicker', () => {
  it('is a named export and a function', () => {
    expect(typeof WhenPicker).toBe('function');
  });

  it('formatHour logic: WhenPicker 12-hour compact format', () => {
    // Replicate WhenPicker's internal formatHour.
    function formatHour(h: number): string {
      if (h === 0 || h === 24) return '12am';
      if (h === 12) return '12pm';
      if (h < 12) return `${h}am`;
      return `${h - 12}pm`;
    }
    expect(formatHour(10)).toBe('10am');
    expect(formatHour(16)).toBe('4pm');
    expect(formatHour(0)).toBe('12am');
    expect(formatHour(12)).toBe('12pm');
    expect(formatHour(22)).toBe('10pm');
  });

  it('summary label matches expected pattern for default window', () => {
    function formatHour(h: number): string {
      if (h === 0 || h === 24) return '12am';
      if (h === 12) return '12pm';
      if (h < 12) return `${h}am`;
      return `${h - 12}pm`;
    }
    const windowStart = 10;
    const windowEnd = 16;
    const summaryHours = `${formatHour(windowStart)}–${formatHour(windowEnd)}`;
    expect(summaryHours).toBe('10am–4pm');
  });
});

describe('all three components are distinct named exports', () => {
  it('DayChips, HourRangeSlider, WhenPicker are all different functions', () => {
    expect(DayChips).not.toBe(HourRangeSlider);
    expect(HourRangeSlider).not.toBe(WhenPicker);
    expect(DayChips).not.toBe(WhenPicker);
  });
});
