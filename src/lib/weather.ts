export interface DailyWeather {
  isoDate: string;
  tMaxC: number;
  tMinC: number;
  precipProb: number; // 0-100
  precipMm: number;
  windMaxKmh: number;
  weatherCode: number; // WMO code
}

export interface WeatherResponse {
  days: DailyWeather[];
  fetchedAt: number;
}

// Day-trip window (local time at each destination).
// Aggregations are computed over hours where DAY_TRIP_START <= hour < DAY_TRIP_END.
// 10..16 exclusive = 10 AM through 3:59 PM, i.e. a "10-to-4" outing.
export const DAY_TRIP_START = 10;
export const DAY_TRIP_END = 16;

interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  precipitation_probability: number[];
  precipitation: number[];
  wind_speed_10m: number[];
  weather_code: number[];
}

interface OpenMeteoLocation {
  hourly: OpenMeteoHourly;
}

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

const HOURLY_PARAMS = [
  'temperature_2m',
  'precipitation_probability',
  'precipitation',
  'wind_speed_10m',
  'weather_code',
].join(',');

// Primary signal is the WMO weather code (what the sky actually looks like).
// Temp / wind / high-precip probability are modifiers on top.
function weatherCodeBaseScore(code: number): number {
  if (code === 0) return 95; // Clear
  if (code === 1) return 82; // Mainly clear
  if (code === 2) return 62; // Partly cloudy
  if (code === 3) return 38; // Overcast
  if (code >= 45 && code <= 48) return 35; // Fog
  if (code >= 51 && code <= 57) return 25; // Drizzle
  if (code >= 61 && code <= 67) return 15; // Rain
  if (code >= 71 && code <= 77) return 12; // Snow
  if (code >= 80 && code <= 82) return 22; // Showers
  if (code >= 85 && code <= 86) return 12; // Snow showers
  if (code >= 95) return 5; // Thunderstorm
  return 40;
}

// Roll hourly readings up into one entry per calendar date, using only the
// hours inside the day-trip window. Representative weather code is the "worst"
// code observed in the window — a 3 PM shower matters for a 10-to-4 trip.
function aggregateHourlyToDaily(hourly: OpenMeteoHourly): DailyWeather[] {
  const byDay = new Map<string, number[]>();

  for (let i = 0; i < hourly.time.length; i++) {
    const t = hourly.time[i];
    const date = t.slice(0, 10);
    const hour = parseInt(t.slice(11, 13), 10);
    if (hour >= DAY_TRIP_START && hour < DAY_TRIP_END) {
      const arr = byDay.get(date) ?? [];
      arr.push(i);
      byDay.set(date, arr);
    }
  }

  const days: DailyWeather[] = [];
  const dates = Array.from(byDay.keys()).sort();
  for (const date of dates) {
    const idx = byDay.get(date)!;
    if (idx.length === 0) continue;

    let tMax = -Infinity;
    let tMin = Infinity;
    let precipProbMax = 0;
    let precipSum = 0;
    let windMax = 0;
    let worstCode = hourly.weather_code[idx[0]] ?? 0;
    let worstScore = weatherCodeBaseScore(worstCode);

    for (const i of idx) {
      const temp = hourly.temperature_2m[i];
      if (typeof temp === 'number') {
        if (temp > tMax) tMax = temp;
        if (temp < tMin) tMin = temp;
      }
      precipProbMax = Math.max(precipProbMax, hourly.precipitation_probability[i] ?? 0);
      precipSum += hourly.precipitation[i] ?? 0;
      windMax = Math.max(windMax, hourly.wind_speed_10m[i] ?? 0);
      const code = hourly.weather_code[i] ?? 0;
      const score = weatherCodeBaseScore(code);
      if (score < worstScore) {
        worstScore = score;
        worstCode = code;
      }
    }

    days.push({
      isoDate: date,
      tMaxC: tMax === -Infinity ? 0 : tMax,
      tMinC: tMin === Infinity ? 0 : tMin,
      precipProb: Math.round(precipProbMax),
      precipMm: Math.round(precipSum * 10) / 10,
      windMaxKmh: windMax,
      weatherCode: worstCode,
    });
  }

  return days;
}

function parseLocation(loc: OpenMeteoLocation): WeatherResponse {
  return { days: aggregateHourlyToDaily(loc.hourly), fetchedAt: Date.now() };
}

// Open-Meteo accepts comma-separated lat/lon lists in a single request.
// Single-location responses return an object; multi-location responses
// return an array. We normalize both to an array.
export async function fetchWeatherBatch(
  coords: { lat: number; lon: number }[],
  signal?: AbortSignal,
): Promise<WeatherResponse[]> {
  if (coords.length === 0) return [];

  const params = new URLSearchParams({
    latitude: coords.map((c) => c.lat.toFixed(4)).join(','),
    longitude: coords.map((c) => c.lon.toFixed(4)).join(','),
    hourly: HOURLY_PARAMS,
    timezone: 'auto',
    forecast_days: '10',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
  });

  const res = await fetch(`${ENDPOINT}?${params}`, { signal });
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  const json = (await res.json()) as OpenMeteoLocation | OpenMeteoLocation[];
  const list = Array.isArray(json) ? json : [json];
  return list.map(parseLocation);
}

export function scoreWeather(d: DailyWeather): number {
  let score = weatherCodeBaseScore(d.weatherCode);

  // Temperature: uncomfortable extremes drag the score down.
  if (d.tMaxC < 2) score -= 25;
  else if (d.tMaxC < 8) score -= 12;
  else if (d.tMaxC < 13) score -= 4;
  else if (d.tMaxC > 34) score -= 20;
  else if (d.tMaxC > 30) score -= 8;

  // Strong wind is miserable outdoors.
  if (d.windMaxKmh > 45) score -= 12;
  else if (d.windMaxKmh > 30) score -= 6;

  // Sanity: a "partly cloudy" code with 90% rain probability isn't really pleasant.
  if (d.precipProb >= 80) score -= 10;
  else if (d.precipProb >= 60) score -= 4;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreBand(score: number): 'great' | 'ok' | 'poor' {
  if (score >= 72) return 'great';
  if (score >= 48) return 'ok';
  return 'poor';
}

// WMO weather code -> short label + emoji
export function weatherCodeToLabel(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: '☀️', label: 'Clear' };
  if (code <= 2) return { emoji: '🌤️', label: 'Mostly sunny' };
  if (code === 3) return { emoji: '☁️', label: 'Cloudy' };
  if (code >= 45 && code <= 48) return { emoji: '🌫️', label: 'Fog' };
  if (code >= 51 && code <= 57) return { emoji: '🌦️', label: 'Drizzle' };
  if (code >= 61 && code <= 67) return { emoji: '🌧️', label: 'Rain' };
  if (code >= 71 && code <= 77) return { emoji: '🌨️', label: 'Snow' };
  if (code >= 80 && code <= 82) return { emoji: '🌦️', label: 'Showers' };
  if (code >= 85 && code <= 86) return { emoji: '🌨️', label: 'Snow showers' };
  if (code >= 95) return { emoji: '⛈️', label: 'Thunderstorm' };
  return { emoji: '❓', label: 'Unknown' };
}
