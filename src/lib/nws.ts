import type { HourlyWeather, WeatherResponse } from './weather';

// api.weather.gov — free, keyless, CORS-enabled, US-only.
//
// Flow per destination:
//   1. GET /points/{lat},{lon}       -> returns a forecastHourly URL
//   2. GET {forecastHourly}          -> returns ~156 hourly periods
//
// Step 1 is cached in localStorage forever (a coord's grid mapping never
// changes). Step 2 is served by NWS's own CDN with ~30-60 min cache, so
// repeat loads mostly hit the CDN, not origin.

interface NwsPointResponse {
  properties: {
    forecastHourly: string;
  };
}

interface NwsPeriod {
  startTime: string;
  temperature: number;
  temperatureUnit: 'F' | 'C';
  probabilityOfPrecipitation: { value: number | null } | null;
  windSpeed: string | null;
  shortForecast: string;
}

interface NwsHourlyResponse {
  properties: {
    periods: NwsPeriod[];
  };
}

const GRID_CACHE_KEY = 'dtp.nwsGrid';

function getCachedUrl(key: string): string | null {
  try {
    const raw = localStorage.getItem(GRID_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<string, string>;
    return cache[key] ?? null;
  } catch {
    return null;
  }
}

function cacheUrl(key: string, url: string): void {
  try {
    const raw = localStorage.getItem(GRID_CACHE_KEY);
    const cache: Record<string, string> = raw ? JSON.parse(raw) : {};
    cache[key] = url;
    localStorage.setItem(GRID_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // quota exceeded or storage disabled — non-fatal
  }
}

function parseWindMph(s: string | null): number {
  if (!s) return 0;
  const nums = s.match(/\d+/g);
  if (!nums) return 0;
  return Math.max(...nums.map(Number));
}

// Map NWS's shortForecast strings to our WMO-ish code space. NWS produces a
// small vocabulary (~15 distinct strings) so regex matching is reliable.
// "Mostly Cloudy" collapses to code 3 (Cloudy) — slight loss of nuance.
export function shortForecastToCode(s: string): number {
  const l = s.toLowerCase();
  if (/thunder|tstorm/.test(l)) return 95;
  if (/blizzard|heavy snow/.test(l)) return 75;
  if (/snow|flurries|sleet|wintry/.test(l)) return 71;
  if (/heavy rain/.test(l)) return 65;
  if (/rain likely/.test(l)) return 63;
  if (/drizzle/.test(l)) return 51;
  if (/showers/.test(l)) return 80;
  if (/rain/.test(l)) return 61;
  if (/fog|haze|mist/.test(l)) return 45;
  if (/mostly cloudy/.test(l)) return 3;
  if (/partly cloudy|partly sunny/.test(l)) return 2;
  if (/mostly sunny|mostly clear/.test(l)) return 1;
  if (/sunny|clear/.test(l)) return 0;
  if (/\bcloudy\b|overcast/.test(l)) return 3;
  return 2;
}

function parseNwsHourly(json: NwsHourlyResponse): WeatherResponse {
  const periods = json.properties.periods;
  const hourly: HourlyWeather = {
    time: [],
    temperature_2m: [],
    precipitation_probability: [],
    precipitation: [],
    wind_speed_10m: [],
    weather_code: [],
  };
  for (const p of periods) {
    // NWS startTime looks like "2026-04-17T11:00:00-07:00"; keep the local
    // hour bit the aggregator parses.
    const iso = p.startTime.slice(0, 13) + ':00';
    const tempC = p.temperatureUnit === 'F' ? ((p.temperature - 32) * 5) / 9 : p.temperature;
    hourly.time.push(iso);
    hourly.temperature_2m.push(tempC);
    hourly.precipitation_probability.push(p.probabilityOfPrecipitation?.value ?? 0);
    hourly.precipitation.push(0);
    hourly.wind_speed_10m.push(parseWindMph(p.windSpeed) * 1.609);
    hourly.weather_code.push(shortForecastToCode(p.shortForecast));
  }
  return { hourly, fetchedAt: Date.now() };
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/geo+json' },
  });
  if (!res.ok) throw new Error(`NWS ${res.status}: ${url}`);
  return (await res.json()) as T;
}

async function fetchJsonWithRetry<T>(
  url: string,
  signal: AbortSignal | undefined,
  retries = 1,
): Promise<T> {
  try {
    return await fetchJson<T>(url, signal);
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 400));
      return fetchJsonWithRetry<T>(url, signal, retries - 1);
    }
    throw e;
  }
}

export async function fetchNwsForDest(
  dest: { id: string; lat: number; lon: number },
  signal?: AbortSignal,
): Promise<WeatherResponse> {
  let hourlyUrl = getCachedUrl(dest.id);
  if (!hourlyUrl) {
    const pointsUrl = `https://api.weather.gov/points/${dest.lat},${dest.lon}`;
    const pt = await fetchJsonWithRetry<NwsPointResponse>(pointsUrl, signal);
    hourlyUrl = pt.properties.forecastHourly;
    cacheUrl(dest.id, hourlyUrl);
  }
  const fc = await fetchJsonWithRetry<NwsHourlyResponse>(hourlyUrl, signal);
  return parseNwsHourly(fc);
}
