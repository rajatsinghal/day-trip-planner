import type { ReactNode } from 'react';
import type { ReasonsToVisit } from '../data/destinations';

// Custom inline SVGs for a couple of reasons where no Unicode emoji is a
// good fit. They size to 1em so they match the surrounding text-size class
// (same in rows, popover chips, and filter bar), and use currentColor so
// they pick up whatever text color the chip is using.
const strokeProps = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const WaterfallIcon = (
  <svg {...strokeProps}>
    <path d="M3 7 h18" />
    <path d="M7 7 v10" />
    <path d="M12 7 v10" />
    <path d="M17 7 v10" />
    <path d="M3 19 q2 -1 4 0 t4 0 t4 0 t4 0 t2 0" />
  </svg>
);

const MuseumIcon = (
  <svg {...strokeProps}>
    <path d="M3 9 L12 3 L21 9" />
    <path d="M3 9 h18" />
    <path d="M7 9 v10" />
    <path d="M12 9 v10" />
    <path d="M17 9 v10" />
    <path d="M3 19 h18" />
  </svg>
);

export const REASON_META: Record<ReasonsToVisit, { emoji: ReactNode; label: string }> = {
  lake: { emoji: '🏞', label: 'Lake' },
  waterfall: { emoji: WaterfallIcon, label: 'Waterfall' },
  coast: { emoji: '🌊', label: 'Coast' },
  island: { emoji: '🏝', label: 'Island' },
  volcano: { emoji: '🌋', label: 'Volcano' },
  viewpoint: { emoji: '🔭', label: 'Viewpoint' },
  wildlife: { emoji: '🦌', label: 'Wildlife' },
  hike: { emoji: '🥾', label: 'Hike' },
  paddle: { emoji: '🛶', label: 'Paddle' },
  fish: { emoji: '🎣', label: 'Fish' },
  ski: { emoji: '⛷', label: 'Ski' },
  town: { emoji: '🏘', label: 'Town' },
  historic: { emoji: '🏛', label: 'Historic' },
  museum: { emoji: MuseumIcon, label: 'Museum' },
  garden: { emoji: '🌸', label: 'Garden' },
  zoo: { emoji: '🐘', label: 'Zoo' },
  farm: { emoji: '🌾', label: 'Farm' },
  picnic: { emoji: '🧺', label: 'Picnic' },
};

// Order used by the filter bar.
export const REASON_ORDER: ReasonsToVisit[] = [
  'lake',
  'waterfall',
  'coast',
  'island',
  'volcano',
  'viewpoint',
  'wildlife',
  'hike',
  'paddle',
  'fish',
  'ski',
  'town',
  'historic',
  'museum',
  'garden',
  'zoo',
  'farm',
  'picnic',
];
