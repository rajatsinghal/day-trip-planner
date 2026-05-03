// HubPicker — trigger button + modal list of all hubs.
// Tapping the trigger opens a modal; tapping a hub in the list calls setHub(id)
// and closes the modal. Selected hub shows a checkmark.

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import { HUBS } from '@dtp/core';
import type { Hub } from '@dtp/core';
import { useStore } from '../store';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

export function HubPicker() {
  const selectedHubId = useStore((s) => s.selectedHubId);
  const setHub = useStore((s) => s.setHub);

  const [open, setOpen] = useState(false);

  const currentHub = HUBS.find((h) => h.id === selectedHubId) ?? HUBS[0];

  const handleSelect = (id: string) => {
    setHub(id);
    setOpen(false);
  };

  return (
    <>
      {/* Trigger button */}
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen(true)}
        accessibilityLabel={`Select metro area, currently ${currentHub.name}`}
        accessibilityRole="button"
      >
        <Text style={styles.triggerText} maxFontSizeMultiplier={1.3} numberOfLines={1}>
          {currentHub.name}
        </Text>
        <Text
          style={styles.chevron}
          allowFontScaling={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          ▾
        </Text>
      </Pressable>

      {/* Picker modal */}
      <Modal
        transparent
        animationType="fade"
        visible={open}
        presentationStyle="overFullScreen"
        onRequestClose={() => setOpen(false)}
      >
        {/* Backdrop */}
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close hub picker"
        />

        {/* List panel */}
        <View style={styles.panel} accessibilityViewIsModal>
          <Text style={styles.panelTitle} maxFontSizeMultiplier={1.3}>
            Choose metro area
          </Text>

          <FlatList<Hub>
            data={HUBS}
            keyExtractor={(h) => h.id}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const selected = item.id === selectedHubId;
              return (
                <Pressable
                  style={styles.row}
                  onPress={() => handleSelect(item.id)}
                  accessibilityLabel={`${item.name}${selected ? ', selected' : ''}`}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[styles.rowText, selected && styles.rowTextSelected]}
                    maxFontSizeMultiplier={1.3}
                  >
                    {item.name}
                  </Text>
                  {selected && (
                    <Text style={styles.checkmark} allowFontScaling={false}>
                      ✓
                    </Text>
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.slate100,
  },
  triggerText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.slate800,
    flexShrink: 1,
  },
  chevron: {
    fontSize: 12,
    color: colors.slate500,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimLight,
  },
  panel: {
    position: 'absolute',
    top: '20%' as unknown as number,
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: '60%' as unknown as number,
    overflow: 'hidden',
  },
  panelTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.slate500,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: colors.slate100,
    marginHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowText: {
    ...typography.bodyLarge,
    color: colors.slate800,
    flex: 1,
  },
  rowTextSelected: {
    fontWeight: '600',
    color: colors.slate900,
  },
  checkmark: {
    fontSize: 16,
    color: colors.sky500,
    marginLeft: spacing.sm,
  },
});
