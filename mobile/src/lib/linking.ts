// Deep link parser for the DayTrip mobile app.
// Scheme: dtp://hub/<hubId>?reasons=<csv>
// Hydration order: deep link > MMKV > default.

import * as Linking from 'expo-linking';
import { HUBS_BY_ID, type ReasonsToVisit } from '@dtp/core';

// Full set of valid reasons — derived from the type at runtime via the
// hub data so we don't maintain a parallel list.
export const VALID_REASONS = new Set<string>([
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
] satisfies ReasonsToVisit[]);

export interface LinkState {
  hubId?: string;
  reasons?: ReasonsToVisit[];
}

/**
 * Parse a dtp:// URL into a LinkState.
 * Unknown hubIds and unknown reason values are silently dropped.
 *
 * Expected format: dtp://hub/<hubId>?reasons=hike,lake
 */
export function parseUrl(url: string): LinkState {
  // Guard: reject non-strings and URLs that are suspiciously long.
  if (typeof url !== 'string' || url.length > 2048) return {};

  // Use the URL API for parsing (available in React Native's Hermes runtime).
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {};
  }

  if (parsed.protocol !== 'dtp:') return {};

  // dtp://hub/<hubId> — pathname is '/<hubId>' when using URL(),
  // or the hostname is 'hub' and the pathname is '/<hubId>'.
  // Expo Linking normalises: scheme://host/path
  const host = parsed.hostname; // 'hub'
  const pathname = parsed.pathname; // '/<hubId>' or '' if at root

  if (host !== 'hub') return {};

  // pathname is typically '/<hubId>' — strip leading slash.
  const hubId = pathname.replace(/^\//, '');
  // Cap hubId length before doing a map lookup.
  if (!hubId || hubId.length > 64) return {};
  if (!HUBS_BY_ID.has(hubId)) return {};

  const result: LinkState = { hubId };

  const rawReasons = parsed.searchParams.get('reasons');
  if (rawReasons != null) {
    let parts = rawReasons
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    // Cap to prevent DoS via enormous reason lists.
    if (parts.length > 50) parts = parts.slice(0, 50);
    const valid = parts.filter((r): r is ReasonsToVisit => VALID_REASONS.has(r));
    if (valid.length > 0) {
      result.reasons = valid;
    }
  }

  return result;
}

/**
 * Build a dtp:// URL from a LinkState.
 * Only includes params that are present and non-empty.
 */
export function buildUrl(state: LinkState): string {
  const hubId = state.hubId ?? 'seattle';
  const base = `dtp://hub/${hubId}`;
  if (state.reasons && state.reasons.length > 0) {
    return `${base}?reasons=${state.reasons.join(',')}`;
  }
  return base;
}

/**
 * Check if the app was launched via a deep link and parse it.
 * Returns an empty object if there was no initial URL or it doesn't match.
 * Call this before store hydration to implement: deep link > MMKV > default.
 */
export async function getInitialState(): Promise<LinkState> {
  try {
    const url = await Linking.getInitialURL();
    if (!url) return {};
    return parseUrl(url);
  } catch {
    return {};
  }
}
