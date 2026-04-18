export type ReasonsToVisit =
  | 'lake'
  | 'waterfall'
  | 'coast'
  | 'island'
  | 'volcano'
  | 'viewpoint'
  | 'wildlife'
  | 'hike'
  | 'paddle'
  | 'fish'
  | 'ski'
  | 'town'
  | 'historic'
  | 'museum'
  | 'garden'
  | 'zoo'
  | 'farm'
  | 'picnic';

export interface Destination {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevation_m?: number;
  reasons_to_visit: ReasonsToVisit[];
  blurb: string;
}

// A hub is a metro area's worth of day trips, anchored to a "center"
// coordinate that drive times are computed from. The `name` is what
// appears in the area picker; `center.name` is the human-readable label
// for the anchor point and is shown alongside drive-time text.
export interface Hub {
  id: string;
  name: string;
  center: {
    name: string;
    lat: number;
    lon: number;
  };
  destinations: Destination[];
}
