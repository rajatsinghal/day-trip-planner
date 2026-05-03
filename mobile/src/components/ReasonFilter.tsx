// ReasonFilter — mobile port of web src/components/ReasonFilter.tsx.
// Exports ReasonChips (horizontal scroll row) and ReasonCount (badge/clear).
// No DOM APIs; uses React Native primitives only.

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ReasonsToVisit } from '@dtp/core';
import { ReasonIcon } from '../icons/reason-icon';
import { useStore } from '../store';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

// ── constants ─────────────────────────────────────────────────────────────

/** Display label for each reason — mirrors REASON_META in web. */
const REASON_LABEL: Record<ReasonsToVisit, string> = {
  lake:      'Lake',
  waterfall: 'Waterfall',
  coast:     'Coast',
  island:    'Island',
  volcano:   'Volcano',
  viewpoint: 'Viewpoint',
  wildlife:  'Wildlife',
  hike:      'Hike',
  paddle:    'Paddle',
  fish:      'Fish',
  ski:       'Ski',
  town:      'Town',
  historic:  'Historic',
  museum:    'Museum',
  garden:    'Garden',
  zoo:       'Zoo',
  farm:      'Farm',
  picnic:    'Picnic',
};

/** Canonical display order — mirrors REASON_ORDER in web. */
export const REASON_ORDER: ReasonsToVisit[] = [
  'lake',
  'waterfall',
  'coast',
  'island',
  'volcano',
  'viewpoint',
  'wildlife',
  'hike',
  'paddle',
  'fish',
  'ski',
  'town',
  'historic',
  'museum',
  'garden',
  'zoo',
  'farm',
  'picnic',
];

// Total count is fixed — 18 reasons in the taxonomy.
export const REASONS_TOTAL = REASON_ORDER.length;

// ── ReasonChips ───────────────────────────────────────────────────────────

/**
 * Horizontal scrollable row of filter pills.
 * Each pill shows the icon (via ReasonIcon) + label.
 * Active pills have filled background; inactive are bordered.
 * Reads/writes selectedReasons via the Zustand store.
 */
export function ReasonChips() {
  const selectedReasons = useStore((s) => s.selectedReasons);
  const toggleReason = useStore((s) => s.toggleReason);

  const selectedSet = new Set<ReasonsToVisit>(selectedReasons);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsContent}
      style={styles.chipsScroll}
      accessibilityRole="toolbar"
    >
      {REASON_ORDER.map((reason) => {
        const active = selectedSet.has(reason);
        const label = REASON_LABEL[reason];
        return (
          <Pressable
            key={reason}
            onPress={() => toggleReason(reason)}
            style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`${label}, ${active ? 'selected' : 'not selected'}`}
            hitSlop={styles.chipHitSlop}
          >
            <ReasonIcon
              reason={reason}
              size={14}
              decorative
            />
            <Text
              style={[styles.chipLabel, active ? styles.chipLabelActive : styles.chipLabelInactive]}
              maxFontSizeMultiplier={1.3}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── ReasonCount ───────────────────────────────────────────────────────────

/**
 * Small badge showing "N/18 filters" when any reasons are selected.
 * Tappable to clear all filters. Hides when nothing is selected.
 */
export function ReasonCount() {
  const selectedReasons = useStore((s) => s.selectedReasons);
  const setReasons = useStore((s) => s.setReasons);

  const count = selectedReasons.length;
  if (count === 0) return null;

  return (
    <Pressable
      onPress={() => setReasons([])}
      style={styles.countBadge}
      accessibilityRole="button"
      accessibilityLabel="Filters active, tap to clear"
      hitSlop={styles.chipHitSlop}
    >
      <Text
        style={styles.countText}
        maxFontSizeMultiplier={1.3}
      >
        {count}/{REASONS_TOTAL}
      </Text>
    </Pressable>
  );
}

// ── styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  chipsScroll: {
    flexGrow: 0,
  },
  chipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    // Ensure minimum 44pt tap height via chip padding.
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2, // 10pt → satisfies ≥44pt hitTarget via hitSlop
    borderRadius: borderRadius.full,
    borderWidth: 1,
    minHeight: 32,
  },
  chipActive: {
    backgroundColor: colors.slate900,
    borderColor: colors.slate900,
  },
  chipInactive: {
    backgroundColor: colors.white,
    borderColor: colors.slate200,
  },
  chipLabel: {
    ...typography.caption,
    flexShrink: 1,
  },
  chipLabelActive: {
    color: colors.white,
  },
  chipLabelInactive: {
    color: colors.slate700,
  },
  chipHitSlop: {
    top: 6,
    bottom: 6,
    left: 4,
    right: 4,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.slate100,
    borderWidth: 1,
    borderColor: colors.slate200,
    minHeight: 28,
  },
  countText: {
    ...typography.caption,
    color: colors.slate600,
    fontVariant: ['tabular-nums'],
  },
});
