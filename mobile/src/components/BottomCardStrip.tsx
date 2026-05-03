// BottomCardStrip — horizontal paging card strip (React Native).
// One card per destination, FlatList horizontal + snap-to-interval.
// Swipe → setSelectedId (map flies). External selectedId change → scrollToIndex.
// Tap → setSelectedId + setDetailId (opens detail sheet).
//
// No browser-only APIs — uses FlatList.onMomentumScrollEnd + index math
// instead of the web scroll/rect APIs used by the original component.

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  memo,
} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import type { EnrichedDestination } from '../store/selectors';
import { useStore } from '../store/index';
import { ReasonIcon } from '../icons/reason-icon';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import {
  formatDriveTime,
  formatTemp,
  weatherCodeToLabel,
} from '@dtp/core';

// ── layout constants ──────────────────────────────────────────────────────
// Imported from a side-effect-free .ts file so smoke tests can import them
// without pulling in the JSX component tree.

export { CARD_WIDTH, SNAP_INTERVAL } from './BottomCardStrip.constants';
import { CARD_WIDTH, SNAP_INTERVAL } from './BottomCardStrip.constants';

// ── CardItem ──────────────────────────────────────────────────────────────
// Extracted to avoid creating new arrow closures per item per render.
// Wrapped in memo so cards only re-render when their own props change.

interface CardItemProps {
  row: EnrichedDestination;
  isSelected: boolean;
  onPress: (id: string) => void;
}

const CardItem = memo(function CardItem({ row, isSelected, onPress }: CardItemProps) {
  const wx = row.weather;
  const label = wx ? weatherCodeToLabel(wx.weatherCode) : null;

  const tempStr = wx && label ? `${label.emoji} ${formatTemp(wx.tMaxC, 'F')}` : 'No forecast';
  const driveStr = formatDriveTime(row.driveMinutes);
  const a11yLabel = `${row.name} · ${tempStr} · ${driveStr}`;

  return (
    <Pressable
      onPress={() => onPress(row.id)}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: isSelected }}
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      {/* Weather emoji — big leading signal */}
      <Text
        style={styles.weatherEmoji}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        allowFontScaling={false}
      >
        {label ? label.emoji : '·'}
      </Text>

      <View style={styles.cardBody}>
        {/* Row 1: name + drive time */}
        <View style={styles.nameRow}>
          <Text
            style={styles.name}
            numberOfLines={1}
            allowFontScaling
            maxFontSizeMultiplier={1.3}
          >
            {row.name}
          </Text>
          <Text
            style={styles.driveTime}
            allowFontScaling
            maxFontSizeMultiplier={1.3}
          >
            {driveStr}
          </Text>
        </View>

        {/* Row 2: weather summary */}
        {wx && label ? (
          <Text
            style={styles.weatherLine}
            numberOfLines={1}
            allowFontScaling
            maxFontSizeMultiplier={1.3}
          >
            {`${formatTemp(wx.tMaxC, 'F')}/${formatTemp(wx.tMinC, 'F')} · Rain ${wx.precipProb}%`}
          </Text>
        ) : (
          <Text
            style={styles.noForecast}
            allowFontScaling
            maxFontSizeMultiplier={1.3}
          >
            No forecast
          </Text>
        )}

        {/* Row 3: top 1–2 reason icons */}
        {row.reasons_to_visit.length > 0 && (
          <View style={styles.iconRow}>
            {row.reasons_to_visit.slice(0, 2).map((r) => (
              <ReasonIcon key={r} reason={r} size={16} decorative />
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
});

// ── imperative handle ─────────────────────────────────────────────────────

export interface BottomCardStripHandle {
  /** Scroll the strip to the card for the given destination id. */
  scrollToId: (id: string) => void;
}

// ── props ─────────────────────────────────────────────────────────────────

interface Props {
  rows: EnrichedDestination[];
}

// ── component ─────────────────────────────────────────────────────────────

export const BottomCardStrip = forwardRef<BottomCardStripHandle, Props>(
  function BottomCardStrip({ rows }, ref) {
    const selectedId = useStore((s) => s.selectedId);
    const setSelectedId = useStore((s) => s.setSelectedId);
    const setDetailId = useStore((s) => s.setDetailId);

    const flatListRef = useRef<FlatList<EnrichedDestination>>(null);

    // Keep a ref to rows so effects/handle can read latest without re-subscribing.
    const rowsRef = useRef(rows);
    rowsRef.current = rows;

    // Track the last scrolled-to index to skip no-op scrolls.
    const lastScrolledIndex = useRef<number>(-1);

    // Stable id→index map, rebuilt only when rows identity changes.
    const idToIndex = useMemo(() => {
      const map = new Map<string, number>();
      rows.forEach((r, i) => map.set(r.id, i));
      return map;
    }, [rows]);

    // ── imperative handle ───────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      scrollToId(id: string) {
        const index = rowsRef.current.findIndex((r) => r.id === id);
        if (index < 0) return;
        flatListRef.current?.scrollToIndex({ index, animated: true });
      },
    }), []);

    // ── external selection → scroll ─────────────────────────────────────
    // When selectedId changes from outside (e.g. map pin tap), scroll the
    // strip to that card.

    useEffect(() => {
      if (!selectedId) return;
      const index = idToIndex.get(selectedId) ?? -1;
      if (index < 0) return;
      if (index === lastScrolledIndex.current) return;
      lastScrolledIndex.current = index;
      flatListRef.current?.scrollToIndex({ index, animated: true });
    }, [selectedId, idToIndex]);

    // ── swipe → select ──────────────────────────────────────────────────
    // After momentum scroll ends, compute which card is centered from
    // contentOffset.x and call setSelectedId. Pure index math — no DOM.

    const handleMomentumScrollEnd = useCallback(
      (e: { nativeEvent: { contentOffset: { x: number } } }) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        // Round to nearest card index.
        const index = Math.round(offsetX / SNAP_INTERVAL);
        const clampedIndex = Math.max(0, Math.min(index, rows.length - 1));
        const row = rows[clampedIndex];
        if (row && row.id !== selectedId) {
          setSelectedId(row.id);
        }
      },
      [rows, selectedId, setSelectedId],
    );

    // ── card press ──────────────────────────────────────────────────────

    const handlePress = useCallback(
      (id: string) => {
        setSelectedId(id);
        setDetailId(id);
      },
      [setSelectedId, setDetailId],
    );

    // ── scroll error recovery ───────────────────────────────────────────
    // FlatList.scrollToIndex can fail if the list hasn't laid out yet.
    // onScrollToIndexFailed scrolls to the nearest available index.

    const handleScrollToIndexFailed = useCallback(
      (info: { index: number; averageItemLength: number }) => {
        const fallback = Math.min(info.index, rows.length - 1);
        flatListRef.current?.scrollToOffset({
          offset: fallback * SNAP_INTERVAL,
          animated: true,
        });
      },
      [rows.length],
    );

    // ── render helpers ──────────────────────────────────────────────────

    const keyExtractor = useCallback(
      (item: EnrichedDestination) => item.id,
      [],
    );

    const renderItem = useCallback(
      ({ item: row }: { item: EnrichedDestination }) => (
        <CardItem
          row={row}
          isSelected={row.id === selectedId}
          onPress={handlePress}
        />
      ),
      [selectedId, handlePress],
    );

    if (rows.length === 0) return null;

    return (
      <FlatList
        ref={flatListRef}
        data={rows}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        getItemLayout={(_, i) => ({ length: SNAP_INTERVAL, offset: SNAP_INTERVAL * i, index: i })}
        contentContainerStyle={styles.contentContainer}
        style={styles.list}
      />
    );
  },
);

// ── styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.md,
    // Shadow — iOS
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardSelected: {
    borderColor: colors.slate900,
  },
  cardPressed: {
    opacity: 0.85,
  },
  weatherEmoji: {
    fontSize: 28,
    lineHeight: 32,
    alignSelf: 'flex-start',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  name: {
    ...typography.body,
    fontWeight: '600',
    color: colors.slate900,
    flex: 1,
  },
  driveTime: {
    ...typography.caption,
    color: colors.slate500,
    flexShrink: 0,
  },
  weatherLine: {
    ...typography.caption,
    color: colors.slate600,
  },
  noForecast: {
    ...typography.caption,
    color: colors.slate400,
  },
  iconRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
});
