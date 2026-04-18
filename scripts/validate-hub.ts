// Run with: npm run validate-hub <hub-id>
// Example:  npm run validate-hub seattle
//
// Validates a hub's structure and content. Schema correctness is
// already enforced by TypeScript at import time — this script catches
// the things TS can't: uniqueness, geographic plausibility, blurb
// length, count thresholds, etc. Designed for the agentic
// contribution flow described in AGENTS.md: agents run this after
// generating a hub file and iterate on errors before opening a PR.

import { HUBS_BY_ID } from '../src/hubs';

const REASON_VALUES = new Set([
  'lake', 'waterfall', 'coast', 'island', 'volcano', 'viewpoint',
  'wildlife', 'hike', 'paddle', 'fish', 'ski', 'town', 'historic',
  'museum', 'garden', 'zoo', 'farm', 'picnic',
]);

// Continental US bounding box (loose). Hubs are restricted to this
// because the weather source (api.weather.gov) only covers the US,
// and Alaska + Hawaii are outside the contiguous range we care about
// for v1.
const US_LAT: [number, number] = [24.5, 49.5];
const US_LON: [number, number] = [-125, -66.5];

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const MAX_DAY_TRIP_KM = 250;
const MIN_BLURB = 30;
const MAX_BLURB = 200;
const MIN_DESTINATIONS_WARN = 15;

function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function inUS(lat: number, lon: number): boolean {
  return lat >= US_LAT[0] && lat <= US_LAT[1] && lon >= US_LON[0] && lon <= US_LON[1];
}

const hubId = process.argv[2];
if (!hubId) {
  console.error('Usage: npm run validate-hub <hub-id>');
  console.error(`Known hubs: ${[...HUBS_BY_ID.keys()].join(', ')}`);
  process.exit(1);
}

const hub = HUBS_BY_ID.get(hubId);
if (!hub) {
  console.error(`Unknown hub: "${hubId}"`);
  console.error(`Known hubs: ${[...HUBS_BY_ID.keys()].join(', ')}`);
  process.exit(1);
}

const errors: string[] = [];
const warnings: string[] = [];

// Hub-level
if (!KEBAB.test(hub.id)) errors.push(`Hub id "${hub.id}" is not kebab-case.`);
if (!hub.name || hub.name.trim().length === 0) errors.push('Hub has no display name.');
if (!hub.center.name || hub.center.name.trim().length === 0) {
  errors.push('Hub center has no name label.');
}
if (!inUS(hub.center.lat, hub.center.lon)) {
  errors.push(
    `Hub center (${hub.center.lat}, ${hub.center.lon}) is outside the continental US bounding box.`,
  );
}

// Destination-level
const seenIds = new Set<string>();
for (const d of hub.destinations) {
  const ctx = `Destination "${d.id}"`;

  if (!KEBAB.test(d.id)) errors.push(`${ctx}: id is not kebab-case.`);
  if (seenIds.has(d.id)) errors.push(`${ctx}: duplicate id within hub.`);
  seenIds.add(d.id);

  if (!d.name || d.name.trim().length === 0) errors.push(`${ctx}: empty name.`);

  if (!inUS(d.lat, d.lon)) {
    errors.push(`${ctx}: lat/lon (${d.lat}, ${d.lon}) is outside the continental US.`);
  }

  if (!d.reasons_to_visit || d.reasons_to_visit.length === 0) {
    errors.push(`${ctx}: no reasons_to_visit.`);
  } else {
    for (const r of d.reasons_to_visit) {
      if (!REASON_VALUES.has(r)) errors.push(`${ctx}: invalid reason "${r}".`);
    }
  }

  const dist = haversineKm(hub.center, d);
  if (dist > MAX_DAY_TRIP_KM) {
    errors.push(
      `${ctx}: ${Math.round(dist)} km from center — too far for a day trip (limit ${MAX_DAY_TRIP_KM} km).`,
    );
  }

  const blurbLen = d.blurb?.length ?? 0;
  if (blurbLen < MIN_BLURB) {
    errors.push(`${ctx}: blurb too short (${blurbLen} chars; min ${MIN_BLURB}).`);
  }
  if (blurbLen > MAX_BLURB) {
    errors.push(`${ctx}: blurb too long (${blurbLen} chars; max ${MAX_BLURB}).`);
  }
}

// Hub-wide warnings (don't fail, but flag for review)
if (hub.destinations.length < MIN_DESTINATIONS_WARN) {
  warnings.push(
    `Only ${hub.destinations.length} destinations — agents typically aim for 25–40. Did the research finish?`,
  );
}

// Output
console.log(`\nValidating: ${hub.name} (${hub.id})`);
console.log(`Destinations: ${hub.destinations.length}`);
console.log();

if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  ⚠  ${w}`);
  console.log();
}

if (errors.length) {
  console.log(`Errors (${errors.length}):`);
  for (const e of errors) console.log(`  ✗  ${e}`);
  console.log();
  console.log(`✗ ${hub.name} hub failed validation.`);
  process.exit(1);
}

console.log(`✓ ${hub.name} hub passes all checks.`);
process.exit(0);
