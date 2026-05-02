// FROZEN as of Phase 2.5 — modifications require a Phase 2.5 amendment.
//
// Wrapper component: renders the icon for a given ReasonsToVisit value.
// WaterfallIcon and MuseumIcon use react-native-svg; all others use emoji Text.
import React from 'react';
import { Text } from 'react-native';
import type { ReasonsToVisit } from '@dtp/core';
import { WaterfallIcon } from './WaterfallIcon';
import { MuseumIcon } from './MuseumIcon';

interface Props {
  reason: ReasonsToVisit;
  size?: number;
  accessibilityLabel?: string;
  decorative?: boolean;
}

const EMOJI_MAP: Partial<Record<ReasonsToVisit, string>> = {
  lake: '🏞',
  coast: '🌊',
  island: '🏝',
  volcano: '🌋',
  viewpoint: '🔭',
  wildlife: '🦌',
  hike: '🥾',
  paddle: '🛶',
  fish: '🎣',
  ski: '⛷',
  town: '🏘',
  historic: '🏛',
  garden: '🌸',
  zoo: '🐘',
  farm: '🌾',
  picnic: '🧺',
};

export function ReasonIcon({ reason, size = 20, accessibilityLabel, decorative = false }: Props) {
  if (reason === 'waterfall') {
    return (
      <WaterfallIcon
        size={size}
        accessibilityLabel={decorative ? undefined : (accessibilityLabel ?? reason)}
      />
    );
  }
  if (reason === 'museum') {
    return (
      <MuseumIcon
        size={size}
        accessibilityLabel={decorative ? undefined : (accessibilityLabel ?? reason)}
      />
    );
  }
  const emoji = EMOJI_MAP[reason];
  if (decorative) {
    return (
      <Text
        style={{ fontSize: size, lineHeight: size * 1.2 }}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden={true}
      >
        {emoji ?? '•'}
      </Text>
    );
  }
  return (
    <Text
      style={{ fontSize: size, lineHeight: size * 1.2 }}
      accessibilityLabel={accessibilityLabel ?? reason}
      accessibilityRole="image"
    >
      {emoji ?? '•'}
    </Text>
  );
}
