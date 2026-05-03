import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import type { DayOption } from '@dtp/core';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

interface Props {
  options: DayOption[];
  selected: string;
  onSelect: (iso: string) => void;
}

export function DayChips({ options, selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((opt) => {
        const isActive = opt.isoDate === selected;
        return (
          <Pressable
            key={opt.isoDate}
            onPress={() => onSelect(opt.isoDate)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={opt.label}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
          >
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.chipLabel, isActive ? styles.chipLabelActive : styles.chipLabelInactive]}
            >
              {opt.label}
            </Text>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.chipSublabel, isActive ? styles.chipSublabelActive : styles.chipSublabelInactive]}
            >
              {opt.sublabel}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipActive: {
    backgroundColor: colors.slate900,
  },
  chipInactive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  chipLabel: {
    ...typography.body,
    fontWeight: '600',
    lineHeight: 18,
  },
  chipLabelActive: {
    color: colors.white,
  },
  chipLabelInactive: {
    color: colors.slate700,
  },
  chipSublabel: {
    ...typography.caption,
    opacity: 0.7,
    lineHeight: 14,
  },
  chipSublabelActive: {
    color: colors.white,
  },
  chipSublabelInactive: {
    color: colors.slate700,
  },
});
