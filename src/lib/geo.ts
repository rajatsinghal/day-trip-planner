const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Rough drive-time estimate from straight-line distance.
// Multiplier accounts for road winding + traffic; avg speed is a heuristic.
// These numbers landed from sanity-checking against Google Maps on several
// Seattle-area routes (Snoqualmie, Leavenworth, Rainier, Port Townsend).
const WINDING_FACTOR = 1.3;
const AVG_KMH = 75;

export function estimateDriveMinutes(distanceKm: number): number {
  return Math.round((distanceKm * WINDING_FACTOR) / AVG_KMH * 60);
}

// Round to nearest 5 min and prefix with ~. The underlying estimate is
// haversine × winding factor (no routing API), and we now compute it from
// a hub center rather than the visitor's actual location, so single-minute
// precision (e.g. "47m") overstates the accuracy. "~45m" reads honest.
export function formatDriveTime(minutes: number): string {
  const rounded = Math.round(minutes / 5) * 5;
  if (rounded < 60) return `~${rounded}m`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m === 0 ? `~${h}h` : `~${h}h ${m}m`;
}
