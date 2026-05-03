// IPadDetailPanel — slides in from the right edge over the map when detailId
// is non-null. Serves the same purpose as MobileDetailSheet (same store driver,
// same content), but presented as a side panel instead of a bottom modal.
//
// Width: 360pt. Position: absolute right:0, top:0, bottom:0.
// Animated translateX 360→0 (open) and 0→360 (close).
// accessibilityViewIsModal on the panel; close button accessibilityLabel="Close detail".

import React, { useRef, useEffect, useMemo } from 'react';
import {
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

const PANEL_WIDTH = 360;

interface Props {
  hub: Hub;
}

export function IPadDetailPanel({ hub }: Props) {
  const detailId        = useStore((s) => s.detailId);
  const setDetailId     = useStore((s) => s.setDetailId);
  const tempUnit        = useStore((s) => s.tempUnit);
  const weatherResponse = useStore((s) => detailId ? s.weatherByDest[detailId] : undefined);
  const selectedDay     = useStore((s) => s.selectedDay);
  const windowHours     = useStore((s) => s.windowHours);

  // Resolve destination with enriched weather/drive data — same pattern as
  // MobileDetailSheet to avoid subscribing to the full enriched array.
  const destination = useMemo(() => {
    if (!detailId) return null;
    const dest = hub.destinations.find((d) => d.id === detailId);
    if (!dest) return null;
    const distanceKm  = haversineKm(hub.center, dest);
    const driveMinutes = estimateDriveMinutes(distanceKm);
    const [startHour, endHour] = selectDisplayWindow({ windowHours, selectedDay });
    const days = weatherResponse
      ? aggregateHourlyToDaily(weatherResponse.hourly, startHour, endHour)
      : null;
    const weather = days?.find((x) => x.isoDate === selectedDay) ?? null;
    return { ...dest, driveMinutes, weather };
  }, [detailId, hub, weatherResponse, selectedDay, windowHours]);

  // Slide-in/out animation from the right edge.
  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const isVisible = destination !== null;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : PANEL_WIDTH,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [isVisible, slideAnim]);

  const handleClose = () => setDetailId(null);

  const wx      = destination?.weather ?? null;
  const wxLabel = wx ? weatherCodeToLabel(wx.weatherCode) : null;
  const mapsUrl = destination
    ? `https://www.google.com/maps/search/?api=1&query=${destination.lat},${destination.lon}`
    : '';

  return (
    <Animated.View
      style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}
      // @ts-ignore — accessibilityViewIsModal is valid but typings may vary
      accessibilityViewIsModal={isVisible}
      pointerEvents={isVisible ? 'box-none' : 'none'}
    >
      {/* Header: weather emoji + name + close button */}
      <View style={styles.header}>
        <View style={styles.nameRow}>
          {wxLabel ? (
            <Text
              style={styles.weatherEmoji}
              allowFontScaling={false}
              accessibilityElementsHidden
            >
              {wxLabel.emoji}
            </Text>
          ) : null}
          <View style={styles.nameMeta}>
            <Text
              style={styles.destinationName}
              numberOfLines={2}
              maxFontSizeMultiplier={1.3}
            >
              {destination?.name ?? ''}
            </Text>
            {destination ? (
              <Text style={styles.driveTime} maxFontSizeMultiplier={1.3}>
                {formatDriveTime(destination.driveMinutes)}
              </Text>
            ) : null}
          </View>
        </View>
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

      {/* Body — only rendered when a destination is active */}
      {destination ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Weather details */}
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

          {/* Google Maps link */}
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
      ) : null}
    </Animated.View>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: colors.white,
    // Shadow on the left edge to separate the panel from the map.
    shadowColor: colors.black,
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 10,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: spacing.md,
    paddingRight: spacing.sm,
  },
  weatherEmoji: {
    fontSize: 28,
    lineHeight: 34,
    marginTop: 2,
    flexShrink: 0,
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
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  closeButtonText: {
    fontSize: 22,
    lineHeight: 28,
    color: colors.slate500,
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
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
