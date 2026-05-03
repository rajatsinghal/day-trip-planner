// DestinationList — Phase 3c
// FlatList of enriched destinations. Ported from web SideList.tsx.
// HoverCard is intentionally NOT ported — hover doesn't exist on touch.

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  FlatList,
  View,
  Text,
  Pressable,
  StyleSheet,
  type ListRenderItemInfo,
} from 'react-native';
import { formatDriveTime, formatTemp, weatherCodeToLabel, type TempUnit } from '@dtp/core';
import type { EnrichedDestination } from '../store/selectors';
import { ReasonIcon } from '../icons/reason-icon';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

// ── public handle ─────────────────────────────────────────────────────────

export interface DestinationListHandle {
  /** Smoothly scrolls to the row with the given id, if present. */
  scrollToId: (id: string) => void;
}

// ── props ─────────────────────────────────────────────────────────────────

export interface DestinationListProps {
  rows: EnrichedDestination[];
  selectedId: string | null;
  loading: boolean;
  tempUnit: TempUnit;
  onSelectId: (id: string) => void;
}

// ── constants ─────────────────────────────────────────────────────────────

const ROW_HEIGHT = 72;      // pt — drives getItemLayout
const SEPARATOR_HEIGHT = 1; // matches separator style height
const SKELETON_COUNT = 8;
const MAX_VISIBLE_REASONS = 6;
const MAX_FONT_SCALE = 1.3;

// ── skeleton row ──────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <View style={styles.rowContainer}>
      <View style={styles.skeletonWeatherBox} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonNameBar} />
        <View style={styles.skeletonCaptionBar} />
      </View>
    </View>
  );
}

// ── separator ─────────────────────────────────────────────────────────────

function Separator() {
  return <View style={styles.separator} />;
}

// ── empty ─────────────────────────────────────────────────────────────────

function Empty() {
  return (
    <View style={styles.emptyContainer}>
      <Text
        style={styles.emptyText}
        allowFontScaling
        maxFontSizeMultiplier={MAX_FONT_SCALE}
      >
        No destinations match the current filters.
      </Text>
    </View>
  );
}

// ── destination row ───────────────────────────────────────────────────────

interface DestinationRowProps {
  row: EnrichedDestination;
  isSelected: boolean;
  tempUnit: TempUnit;
  onPress: (id: string) => void;
}

function DestinationRow({ row, isSelected, tempUnit, onPress }: DestinationRowProps) {
  const wx = row.weather;
  const wxLabel = wx ? weatherCodeToLabel(wx.weatherCode) : null;

  const visibleReasons = row.reasons_to_visit.slice(0, MAX_VISIBLE_REASONS);
  const extraReasonCount = row.reasons_to_visit.length - visibleReasons.length;

  // Build accessibility label: "Name, drive time, weather summary"
  const driveStr = formatDriveTime(row.driveMinutes);
  const weatherStr = wxLabel
    ? `${wxLabel.label}, ${formatTemp(wx!.tMaxC, tempUnit)}/${formatTemp(wx!.tMinC, tempUnit)}, rain ${wx!.precipProb}%`
    : 'weather loading';
  const accessibilityLabel = `${row.name}, ${driveStr}, ${weatherStr}`;

  const handlePress = useCallback(() => onPress(row.id), [onPress, row.id]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isSelected }}
      style={({ pressed }) => [
        styles.rowPressable,
        isSelected && styles.rowSelected,
        pressed && !isSelected && styles.rowPressed,
      ]}
    >
      {/* 4px selection indicator on left edge */}
      {isSelected && <View style={styles.selectionBar} />}

      {/* Weather emoji — big leading at-a-glance signal */}
      <Text
        style={styles.weatherEmoji}
        allowFontScaling={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {wxLabel ? wxLabel.emoji : '·'}
      </Text>

      {/* Main content */}
      <View style={styles.rowContent}>
        {/* Name + drive time row */}
        <View style={styles.nameRow}>
          <Text
            style={[styles.nameText, isSelected && styles.nameTextSelected]}
            numberOfLines={1}
            allowFontScaling
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            {row.name}
          </Text>
          <Text
            style={styles.driveTimeText}
            allowFontScaling
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            {driveStr}
          </Text>
        </View>

        {/* Reason icons */}
        {visibleReasons.length > 0 && (
          <View
            style={styles.reasonsRow}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            {visibleReasons.map((r) => (
              <ReasonIcon key={r} reason={r} size={16} decorative />
            ))}
            {extraReasonCount > 0 && (
              <Text style={styles.extraReasonsText} allowFontScaling={false}>
                +{extraReasonCount}
              </Text>
            )}
          </View>
        )}

        {/* Weather detail row */}
        {wx && wxLabel ? (
          <Text
            style={styles.weatherDetailText}
            numberOfLines={1}
            allowFontScaling
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            {formatTemp(wx.tMaxC, tempUnit)}/{formatTemp(wx.tMinC, tempUnit)}
            {'  ·  '}Rain {wx.precipProb}%
          </Text>
        ) : (
          <View style={styles.weatherSkeletonBar} />
        )}
      </View>
    </Pressable>
  );
}

// ── main component ────────────────────────────────────────────────────────

export const DestinationList = forwardRef<DestinationListHandle, DestinationListProps>(
  function DestinationList({ rows, selectedId, loading, tempUnit, onSelectId }, ref) {
    const listRef = useRef<FlatList<EnrichedDestination>>(null);

    // Build an id→index map for O(1) scrollToId lookup.
    const idToIndex = useMemo(() => {
      const map = new Map<string, number>();
      rows.forEach((r, i) => map.set(r.id, i));
      return map;
    }, [rows]);

    useImperativeHandle(ref, () => ({
      scrollToId(id: string) {
        const index = idToIndex.get(id);
        if (index === undefined) return;
        listRef.current?.scrollToIndex({ index, animated: true });
      },
    }), [idToIndex]);

    const keyExtractor = useCallback((item: EnrichedDestination) => item.id, []);

    const getItemLayout = useCallback(
      (_: ArrayLike<EnrichedDestination> | null | undefined, index: number) => ({
        length: ROW_HEIGHT + SEPARATOR_HEIGHT,
        offset: (ROW_HEIGHT + SEPARATOR_HEIGHT) * index,
        index,
      }),
      [],
    );

    const handleScrollToIndexFailed = useCallback(
      (info: { index: number }) => {
        listRef.current?.scrollToOffset({
          offset: info.index * (ROW_HEIGHT + SEPARATOR_HEIGHT),
          animated: true,
        });
      },
      [],
    );

    const renderItem = useCallback(
      ({ item }: ListRenderItemInfo<EnrichedDestination>) => (
        <DestinationRow
          row={item}
          isSelected={item.id === selectedId}
          tempUnit={tempUnit}
          onPress={onSelectId}
        />
      ),
      [selectedId, tempUnit, onSelectId],
    );

    // Skeleton mode — show placeholder rows when weather is loading
    if (loading && rows.length === 0) {
      return (
        <View style={styles.skeletonContainer}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <React.Fragment key={i}>
              <SkeletonRow />
              {i < SKELETON_COUNT - 1 && <Separator />}
            </React.Fragment>
          ))}
        </View>
      );
    }

    return (
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={Empty}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        removeClippedSubviews
        showsVerticalScrollIndicator
      />
    );
  },
);

// ── styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Skeleton
  skeletonContainer: {
    flex: 1,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: ROW_HEIGHT,
  },
  skeletonWeatherBox: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: colors.slate100,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  skeletonContent: {
    flex: 1,
    gap: spacing.xs,
  },
  skeletonNameBar: {
    height: 14,
    width: '65%',
    borderRadius: 4,
    backgroundColor: colors.slate100,
  },
  skeletonCaptionBar: {
    height: 10,
    width: '40%',
    borderRadius: 4,
    backgroundColor: colors.slate100,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: colors.slate200,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.slate500,
    textAlign: 'center',
  },

  // Row
  rowPressable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: ROW_HEIGHT,
    backgroundColor: colors.white,
  },
  rowSelected: {
    backgroundColor: colors.slate200,
  },
  rowPressed: {
    backgroundColor: colors.slate50,
  },
  selectionBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.slate900,
  },
  weatherEmoji: {
    fontSize: 24,
    lineHeight: 28,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  nameText: {
    ...typography.bodyLarge,
    color: colors.slate900,
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
  },
  nameTextSelected: {
    fontWeight: '600',
  },
  driveTimeText: {
    ...typography.caption,
    color: colors.slate500,
    flexShrink: 0,
  },
  reasonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  extraReasonsText: {
    fontSize: 11,
    color: colors.slate500,
  },
  weatherDetailText: {
    ...typography.caption,
    color: colors.slate600,
  },
  weatherSkeletonBar: {
    height: 10,
    width: '55%',
    borderRadius: 3,
    backgroundColor: colors.slate100,
  },
});
