// Mobile port of MuseumIcon from src/lib/reasons_to_visit.tsx.
// Uses react-native-svg primitives — no HTML <svg> elements.
// Geometry is identical to the web version.
import React from 'react';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
  accessibilityLabel?: string;
}

export function MuseumIcon({ size = 24, color = 'currentColor', accessibilityLabel }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color === 'currentColor' ? '#000000' : color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityLabel={accessibilityLabel}
      accessible={!!accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      {/* Frame */}
      <Rect x={3} y={4} width={18} height={12} rx={0.8} />
      {/* Mountain + sun painting inside frame */}
      <Path d="M5 13 L 9 8 L 12 11 L 16 7 L 19 13" />
      <Circle cx={16.5} cy={7} r={1.2} />
      {/* Plaque underneath */}
      <Rect x={8} y={18} width={8} height={2} rx={0.3} />
    </Svg>
  );
}
