// TileFallbackBanner — inline banner shown when the WebView has reported a
// TILE_ERROR. Tells the user map graphics couldn't load but pins/forecasts
// still work (data is fetched natively, not via the WebView tile network).
//
// NetInfo is NOT installed in v1 — we track the TILE_ERROR signal from the
// map via the `hasTileError` prop and show/hide based solely on that. If the
// map recovers (new hub or reload), the parent clears hasTileError.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

interface Props {
  /** Pass true when the map has reported TILE_ERROR and not yet recovered. */
  hasTileError: boolean;
}

export function TileFallbackBanner({ hasTileError }: Props) {
  if (!hasTileError) return null;

  return (
    <View
      style={styles.banner}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text style={styles.text} maxFontSizeMultiplier={1.3} numberOfLines={2}>
        {'Connect to load map graphics — pins and forecasts work offline.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.sky100,
    borderBottomWidth: 1,
    borderBottomColor: colors.sky200,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
  },
  text: {
    flex: 1,
    color: colors.slate800,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
});
