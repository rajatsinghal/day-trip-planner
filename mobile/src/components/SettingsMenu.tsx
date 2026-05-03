// SettingsMenu — mobile port of web src/components/SettingsMenu.tsx.
// Gear icon trigger opens a Modal with temperature unit segmented control.
// No DOM APIs; uses React Native Modal + @expo/vector-icons.

import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

// ── SettingsMenu ──────────────────────────────────────────────────────────

/**
 * Gear icon button that opens a modal settings panel.
 * V1 settings: temperature unit (°F / °C).
 * Future settings can be added as additional rows inside the modal.
 */
export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const tempUnit = useStore((s) => s.tempUnit);
  const setTempUnit = useStore((s) => s.setTempUnit);

  return (
    <>
      {/* Gear trigger button */}
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        accessibilityState={{ expanded: open }}
        hitSlop={styles.triggerHitSlop}
      >
        <Ionicons
          name="settings-outline"
          size={18}
          color={colors.slate600}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Pressable>

      {/* Settings modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        {/* Backdrop — tap to dismiss */}
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close settings"
        />

        {/* Panel — sibling of backdrop so inner taps don't bubble */}
        <View
          style={styles.panelContainer}
          pointerEvents="box-none"
        >
          <View
            style={styles.panel}
            onStartShouldSetResponder={() => true}
          >
            {/* Header row */}
            <View style={styles.header}>
              <Text
                style={styles.headerTitle}
                maxFontSizeMultiplier={1.3}
              >
                Settings
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close settings"
                hitSlop={styles.closeHitSlop}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={colors.slate600}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              </Pressable>
            </View>

            {/* ── Temperature unit ─────────────────────────────────────── */}
            <View style={styles.section}>
              <Text
                style={styles.sectionLabel}
                maxFontSizeMultiplier={1.3}
              >
                Temperature
              </Text>
              <View style={styles.segmentedControl}>
                {(['F', 'C'] as const).map((unit) => {
                  const active = tempUnit === unit;
                  return (
                    <Pressable
                      key={unit}
                      onPress={() => setTempUnit(unit)}
                      style={[
                        styles.segment,
                        active ? styles.segmentActive : styles.segmentInactive,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      accessibilityLabel={`Degrees ${unit === 'F' ? 'Fahrenheit' : 'Celsius'}${active ? ', selected' : ''}`}
                    >
                      <Text
                        style={[
                          styles.segmentLabel,
                          active ? styles.segmentLabelActive : styles.segmentLabelInactive,
                        ]}
                        maxFontSizeMultiplier={1.3}
                      >
                        °{unit}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Future settings go here */}
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  trigger: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerHitSlop: {
    top: 4,
    bottom: 4,
    left: 4,
    right: 4,
  },

  // Modal
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  panelContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    width: 260,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.slate900,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  closeHitSlop: {
    top: 6,
    bottom: 6,
    left: 6,
    right: 6,
  },

  // Section
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.slate500,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Segmented control
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  segmentActive: {
    backgroundColor: colors.slate900,
  },
  segmentInactive: {
    backgroundColor: colors.white,
  },
  segmentLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: colors.white,
  },
  segmentLabelInactive: {
    color: colors.slate600,
  },
});
