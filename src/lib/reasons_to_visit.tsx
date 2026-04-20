import type { ReactNode } from 'react';
import type { ReasonsToVisit } from '../hubs';

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

// Mini landscape scene: green peak with a white waterfall ribbon cascading
// into a blue pool at the base. Trapezoidal ribbon + foam splash makes the
// water carry visual weight at small sizes; flow lines inside add texture.
const WaterfallIcon = (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M2 20 L 9 2 L 13 11 L 17 7 L 22 20 Z" fill="#86efac" stroke="#16a34a" strokeWidth="0.8" />
    <path d="M8.2 2.5 L 7 20 L 10.5 20 L 9.5 2.5 Z" fill="white" stroke="#0284c7" strokeWidth="0.6" />
    <line x1="8.6" y1="4" x2="8.2" y2="19" stroke="#38bdf8" strokeWidth="0.5" />
    <line x1="9.1" y1="4" x2="9.4" y2="19" stroke="#38bdf8" strokeWidth="0.5" />
    <rect x="2" y="20" width="20" height="3.5" fill="#0ea5e9" rx="0.6" />
    <ellipse cx="8.75" cy="20.3" rx="2.2" ry="0.5" fill="white" opacity="0.9" />
    <path d="M4 22 h2 m3 0 h2 m3 0 h2 m3 0 h2" stroke="white" strokeWidth="0.6" opacity="0.7" />
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
