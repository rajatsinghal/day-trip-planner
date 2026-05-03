// Bottom sheet shown when detailId is non-null.
// Mirrors the web MobileDetailSheet in content; uses React Native Modal instead of
// DOM positioning. Backdrop tap closes; sheet slides up from bottom.

import React, { useRef, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  Animated,
  StyleSheet,
} from 'react-native';
import { useStore } from '../store';
import {
  weatherCodeToLabel,
  formatTemp,
  formatWind,
  formatDriveTime,
  aggregateHourlyToDaily,
  haversineKm,
  estimateDriveMinutes,
  type Hub,
} from '@dtp/core';
import { selectDisplayWindow } from '../store/selectors';
import { ReasonIcon } from '../icons/reason-icon';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

interface Props {
  hub: Hub;
}

export function MobileDetailSheet({ hub }: Props) {
  const detailId = useStore((s) => s.detailId);
  const setDetailId = useStore((s) => s.setDetailId);
  const tempUnit = useStore((s) => s.tempUnit);
  const weatherResponse = useStore((s) => detailId ? s.weatherByDest[detailId] : undefined);
  const selectedDay = useStore((s) => s.selectedDay);
  const windowHours = useStore((s) => s.windowHours);

  // Resolve the destination and compute enriched fields locally — avoids
  // subscribing to the full enrichedRows array which rebuilds on every tick.
  const destination = useMemo(() => {
    if (!detailId) return null;
    const dest = hub.destinations.find((d) => d.id === detailId);
    if (!dest) return null;
    const distanceKm = haversineKm(hub.center, dest);
    const driveMinutes = estimateDriveMinutes(distanceKm);
    const [startHour, endHour] = selectDisplayWindow({ windowHours, selectedDay });
    const days = weatherResponse
      ? aggregateHourlyToDaily(weatherResponse.hourly, startHour, endHour)
      : null;
    const weather = days?.find((x) => x.isoDate === selectedDay) ?? null;
    return { ...dest, driveMinutes, weather };
  }, [detailId, hub, weatherResponse, selectedDay, windowHours]);

  // Slide-up animation
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (destination) {
      slideAnim.setValue(300);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [destination?.id, slideAnim]);

  const handleClose = () => setDetailId(null);

  if (!destination) return null;

  const wx = destination.weather;
  const wxLabel = wx ? weatherCodeToLabel(wx.weatherCode) : null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${destination.lat},${destination.lon}`;

  return (
    <Modal
      transparent
      animationType="none"
      visible={true}
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Pressable
        style={styles.backdrop}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Close detail"
      />

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        accessibilityViewIsModal
      >
        {/* Drag handle + close button */}
        <View style={styles.header}>
          <View style={styles.dragHandle} />
          <Pressable
            style={styles.closeButton}
            onPress={handleClose}
            accessibilityLabel="Close detail"
            accessibilityRole="button"
          >
            <Text style={styles.closeButtonText} allowFontScaling={false}>
              ×
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Name + weather emoji hero */}
          <View style={styles.nameRow}>
            <Text style={styles.weatherEmoji} allowFontScaling={false} accessibilityElementsHidden>
              {wxLabel ? wxLabel.emoji : '·'}
            </Text>
            <View style={styles.nameMeta}>
              <Text
                style={styles.destinationName}
                numberOfLines={2}
                maxFontSizeMultiplier={1.3}
              >
                {destination.name}
              </Text>
              <Text style={styles.driveTime} maxFontSizeMultiplier={1.3}>
                {formatDriveTime(destination.driveMinutes)}
              </Text>
            </View>
          </View>

          {/* Weather details row */}
          {wx && wxLabel ? (
            <Text style={styles.weatherMeta} maxFontSizeMultiplier={1.3}>
              {wxLabel.label}
              {'  ·  '}
              {formatTemp(wx.tMaxC, tempUnit)} / {formatTemp(wx.tMinC, tempUnit)}
              {'  ·  '}
              Rain {wx.precipProb}%
              {'  ·  '}
              Wind {formatWind(wx.windMaxKmh, tempUnit)}
            </Text>
          ) : (
            <Text style={styles.noForecast} maxFontSizeMultiplier={1.3}>
              No forecast
            </Text>
          )}

          {/* Blurb */}
          <Text style={styles.blurb} maxFontSizeMultiplier={1.3}>
            {destination.blurb}
          </Text>

          {/* Reason icons */}
          {destination.reasons_to_visit.length > 0 && (
            <View style={styles.reasonRow}>
              {destination.reasons_to_visit.map((r) => (
                <View key={r} style={styles.reasonChip}>
                  <ReasonIcon reason={r} size={14} decorative />
                  <Text style={styles.reasonLabel} maxFontSizeMultiplier={1.3}>
                    {r}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Google Maps button */}
          <Pressable
            style={styles.mapsButton}
            onPress={() => void Linking.openURL(mapsUrl)}
            accessibilityLabel="Open in Google Maps"
            accessibilityRole="link"
          >
            <Text style={styles.mapsButtonText} maxFontSizeMultiplier={1.3}>
              Open in Google Maps ↗
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '85%' as unknown as number,
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.slate300,
  },
  closeButton: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 22,
    lineHeight: 28,
    color: colors.slate500,
    fontWeight: '400',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  weatherEmoji: {
    fontSize: 30,
    lineHeight: 36,
    marginTop: 2,
  },
  nameMeta: {
    flex: 1,
    minWidth: 0,
  },
  destinationName: {
    ...typography.headline,
    color: colors.slate900,
  },
  driveTime: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  weatherMeta: {
    ...typography.caption,
    color: colors.slate600,
    marginBottom: spacing.sm,
  },
  noForecast: {
    ...typography.caption,
    color: colors.slate400,
    marginBottom: spacing.sm,
  },
  blurb: {
    ...typography.body,
    color: colors.slate700,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.slate200,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
  },
  reasonLabel: {
    ...typography.caption,
    color: colors.slate800,
  },
  mapsButton: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  mapsButtonText: {
    ...typography.body,
    color: colors.slate700,
    fontWeight: '500',
  },
});
