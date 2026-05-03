import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Slider } from '@miblanchard/react-native-slider';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

interface Props {
  start: number;
  end: number;
  min?: number;
  max?: number;
  minGap?: number;
  onChange: (start: number, end: number) => void;
}

function formatHour(h: number): string {
  const wrapped = h === 24 ? 24 : h % 24;
  if (wrapped === 0 || wrapped === 24) return '12 AM';
  if (wrapped === 12) return '12 PM';
  if (wrapped < 12) return `${wrapped} AM`;
  return `${wrapped - 12} PM`;
}

export function HourRangeSlider({
  start,
  end,
  min = 4,
  max = 22,
  minGap = 2,
  onChange,
}: Props) {
  const handleValueChange = (values: Array<number>) => {
    if (values.length < 2) return;
    let newStart = Math.round(values[0]);
    let newEnd = Math.round(values[1]);
    // Enforce minimum gap
    if (newEnd - newStart < minGap) {
      // Determine which thumb moved by comparing to current
      if (newStart !== start) {
        newStart = Math.min(newStart, newEnd - minGap);
      } else {
        newEnd = Math.max(newEnd, newStart + minGap);
      }
    }
    newStart = Math.max(min, Math.min(newStart, max - minGap));
    newEnd = Math.min(max, Math.max(newEnd, min + minGap));
    if (newStart !== start || newEnd !== end) {
      onChange(newStart, newEnd);
    }
  };

  return (
    <View style={styles.container}>
      <Text maxFontSizeMultiplier={1.3} style={styles.label}>
        Trip window
      </Text>
      <View
        style={styles.sliderWrapper}
        accessible
        accessibilityLabel="Trip start time and end time"
        accessibilityValue={{ text: `${formatHour(start)} to ${formatHour(end)}` }}
      >
        <Slider
          value={[start, end]}
          minimumValue={min}
          maximumValue={max}
          step={1}
          onValueChange={handleValueChange}
          minimumTrackTintColor={colors.slate900}
          maximumTrackTintColor={colors.slate200}
          thumbTintColor={colors.slate900}
          trackStyle={styles.track}
          thumbStyle={styles.thumb}
          animationType="timing"
          renderBelowThumbComponent={(_index: number, value: number) => (
            <Text maxFontSizeMultiplier={1.3} style={styles.thumbLabel}>
              {formatHour(Math.round(value))}
            </Text>
          )}
        />
      </View>
      <Text maxFontSizeMultiplier={1.3} style={styles.summary}>
        {formatHour(start)}-{formatHour(end)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.slate500,
    flexShrink: 0,
  },
  sliderWrapper: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  track: {
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.slate900,
  },
  thumbLabel: {
    ...typography.caption,
    color: colors.slate700,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  summary: {
    ...typography.body,
    fontWeight: '500',
    color: colors.slate700,
    flexShrink: 0,
  },
});
