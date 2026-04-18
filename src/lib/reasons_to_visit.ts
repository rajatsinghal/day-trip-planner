import type { ReasonsToVisit } from '../data/destinations';

export const REASON_META: Record<ReasonsToVisit, { emoji: string; label: string }> = {
  lake: { emoji: '🏞', label: 'Lake' },
  waterfall: { emoji: '💦', label: 'Waterfall' },
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
  museum: { emoji: '🖼', label: 'Museum' },
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
