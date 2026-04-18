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

// Arched cliff lip with three curving streams spilling into a wavy pool.
// The curves (not straight lines) are the thing that reads as "water, not
// table legs."
const WaterfallIcon = (
  <svg {...strokeProps}>
    <path d="M2 8 Q 6 4 10 6 T 16 6 T 22 6" />
    <path d="M7 7 Q 6.3 11 7.3 15 T 7 18" />
    <path d="M12 6 Q 11.3 11 12.3 15 T 12 18" />
    <path d="M17 6 Q 16.3 11 17.3 15 T 17 18" />
    <path d="M3 20 Q 6 18 9 20 T 15 20 T 21 20" />
  </svg>
);

// Framed painting (mountain + sun) with a small plaque underneath — the
// specifically "gallery / museum" cue, not just another classical building
// silhouette (we already use 🏛 for `historic`).
const MuseumIcon = (
  <svg {...strokeProps}>
    <rect x="3" y="4" width="18" height="12" rx="0.8" />
    <path d="M5 13 L 9 8 L 12 11 L 16 7 L 19 13" />
    <circle cx="16.5" cy="7" r="1.2" />
    <rect x="8" y="18" width="8" height="2" rx="0.3" />
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
