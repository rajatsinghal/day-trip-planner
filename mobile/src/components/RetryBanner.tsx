// RetryBanner — surfaces above the main content when one or more
// destination weather fetches have failed. Tapping "Retry" calls
// store.retryFailed which re-runs only the failed-id workers.

import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useStore } from '../store';
import { selectAnyFailed } from '../store/selectors';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

export function RetryBanner() {
  const anyFailed = useStore(selectAnyFailed);
  const failedCount = useStore((s) => s.failedIds.size);
  const retrying = useStore((s) => s.retrying);
  const retryFailed = useStore((s) => s.retryFailed);

  if (!anyFailed) return null;

  const label = `${failedCount} forecast${failedCount === 1 ? '' : 's'} failed to load`;
  const a11yLabel = retrying
    ? `Retrying ${failedCount} failed forecast${failedCount === 1 ? '' : 's'}`
    : `${label}, tap Retry to try again`;

  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <Text style={styles.label} maxFontSizeMultiplier={1.3} numberOfLines={2}>
        {label}
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.retryButton,
          retrying && styles.retryButtonDisabled,
          pressed && !retrying && styles.retryButtonPressed,
        ]}
        onPress={() => {
          if (!retrying) retryFailed();
        }}
        disabled={retrying}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ disabled: retrying, busy: retrying }}
      >
        {retrying ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={styles.retryText} maxFontSizeMultiplier={1.3} allowFontScaling>
            Retry
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#fef3c7', // warning amber-100, intentionally not in the
    // theme palette — banner is the only consumer in v1
    borderBottomWidth: 1,
    borderBottomColor: colors.slate300,
    gap: spacing.md,
  },
  label: {
    flex: 1,
    color: colors.slate800,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  retryButton: {
    minWidth: 72,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    backgroundColor: '#dc2626', // red-600 — banner-only intent color (not in palette)
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryText: {
    color: colors.white,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
});
