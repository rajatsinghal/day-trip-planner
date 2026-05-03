import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import type { DayOption } from '@dtp/core';
import { DayChips } from './DayChips';
import { HourRangeSlider } from './HourRangeSlider';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

interface Props {
  dayOptions: DayOption[];
  selectedDay: string;
  onSelectDay: (iso: string) => void;
  windowStart: number;
  windowEnd: number;
  windowMin: number;
  windowMax: number;
  onWindowChange: (start: number, end: number) => void;
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12am';
  if (h === 12) return '12pm';
  if (h < 12) return `${h}am`;
  return `${h - 12}pm`;
}

export function WhenPicker({
  dayOptions,
  selectedDay,
  onSelectDay,
  windowStart,
  windowEnd,
  windowMin,
  windowMax,
  onWindowChange,
}: Props) {
  const [open, setOpen] = useState(false);

  const activeDay = dayOptions.find((d) => d.isoDate === selectedDay) ?? dayOptions[0];
  const summaryHours = `${formatHour(windowStart)}–${formatHour(windowEnd)}`;
  const triggerLabel = `Day and trip window: ${activeDay?.label ?? ''}, ${summaryHours}`;

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={triggerLabel}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
      >
        <Text maxFontSizeMultiplier={1.3} style={styles.triggerDayText}>
          {activeDay?.label ?? ''}
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.triggerSeparator}>
          {' · '}
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.triggerHoursText}>
          {summaryHours}
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.triggerChevron} aria-hidden>
          {'  ▾'}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        {/* Backdrop — tapping it closes the sheet */}
        <Pressable
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel="Close day and window picker"
          onPress={() => setOpen(false)}
        />
        <SafeAreaView style={styles.sheetSafeArea} pointerEvents="box-none">
          <View style={styles.sheet} accessibilityViewIsModal>
            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <Text maxFontSizeMultiplier={1.3} style={styles.sheetTitle}>
                When
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close picker"
                style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
              >
                <Text maxFontSizeMultiplier={1.3} style={styles.closeButtonText}>
                  Done
                </Text>
              </Pressable>
            </View>

            {/* Day chips */}
            <View style={styles.section}>
              <Text maxFontSizeMultiplier={1.3} style={styles.sectionLabel}>
                Day
              </Text>
              <DayChips
                options={dayOptions}
                selected={selectedDay}
                onSelect={onSelectDay}
              />
            </View>

            {/* Hour range slider */}
            <View style={styles.section}>
              <HourRangeSlider
                start={windowStart}
                end={windowEnd}
                min={windowMin}
                max={windowMax}
                onChange={onWindowChange}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  triggerPressed: {
    backgroundColor: colors.slate50,
  },
  triggerDayText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.slate800,
  },
  triggerSeparator: {
    ...typography.body,
    color: colors.slate400,
  },
  triggerHoursText: {
    ...typography.body,
    color: colors.slate800,
  },
  triggerChevron: {
    ...typography.caption,
    color: colors.slate400,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  sheetSafeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    ...typography.headline,
    color: colors.slate900,
  },
  closeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  closeButtonPressed: {
    backgroundColor: colors.slate100,
  },
  closeButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.sky600,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.slate500,
    marginBottom: spacing.sm,
  },
});
