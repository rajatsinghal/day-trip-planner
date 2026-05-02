// Mobile port of WaterfallIcon from src/lib/reasons_to_visit.tsx.
// Uses react-native-svg primitives — no HTML <svg> elements.
// Geometry is identical to the web version.
import React from 'react';
import Svg, { Path, Line, Rect, Ellipse } from 'react-native-svg';

interface Props {
  size?: number;
  accessibilityLabel?: string;
}

export function WaterfallIcon({ size = 24, accessibilityLabel }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityLabel={accessibilityLabel}
      accessible={!!accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      {/* Green mountain */}
      <Path
        d="M2 20 L 9 2 L 13 11 L 17 7 L 22 20 Z"
        fill="#86efac"
        stroke="#16a34a"
        strokeWidth={0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Waterfall ribbon */}
      <Path
        d="M8.2 2.5 L 7 20 L 10.5 20 L 9.5 2.5 Z"
        fill="white"
        stroke="#0284c7"
        strokeWidth={0.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Flow lines */}
      <Line x1={8.6} y1={4} x2={8.2} y2={19} stroke="#38bdf8" strokeWidth={0.5} />
      <Line x1={9.1} y1={4} x2={9.4} y2={19} stroke="#38bdf8" strokeWidth={0.5} />
      {/* Pool */}
      <Rect x={2} y={20} width={20} height={3.5} fill="#0ea5e9" rx={0.6} />
      {/* Foam */}
      <Ellipse cx={8.75} cy={20.3} rx={2.2} ry={0.5} fill="white" opacity={0.9} />
      {/* Flow lines in pool */}
      <Path
        d="M4 22 h2 m3 0 h2 m3 0 h2 m3 0 h2"
        stroke="white"
        strokeWidth={0.6}
        opacity={0.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}
