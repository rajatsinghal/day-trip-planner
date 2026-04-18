export interface DailyWeather {
  isoDate: string;
  tMaxC: number;
  tMinC: number;
  precipProb: number; // 0-100
  precipMm: number;
  windMaxKmh: number;
  weatherCode: number; // WMO code
}

export interface HourlyWeather {
  time: string[];
  temperature_2m: number[];
  precipitation_probability: number[];
  precipitation: number[];
  wind_speed_10m: number[];
  weather_code: number[];
  cloud_cover: number[];
}

export interface WeatherResponse {
  hourly: HourlyWeather;
  fetchedAt: number;
}

interface OpenMeteoLocation {
  hourly: HourlyWeather;
}

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

const HOURLY_PARAMS = [
  'temperature_2m',
  'precipitation_probability',
  'precipitation',
  'wind_speed_10m',
  'weather_code',
  'cloud_cover',
].join(',');

// Any code >= 45 is precipitation / fog / snow / thunder — these are "real"
// weather events that should dominate the representative label regardless
// of cloud cover.
function isPrecipOrFogCode(code: number): boolean {
  return code >= 45;
}

// Derive a cloud-only WMO code from average cloud cover %.
// Thresholds chosen so 60-75% reads as "cloudy" — matching how most
// people describe a sky vs. Open-Meteo's more lenient code-2 bucket.
function cloudCoverToCode(pct: number): number {
  if (pct >= 75) return 3; // overcast
  if (pct >= 50) return 2; // partly cloudy
  if (pct >= 20) return 1; // mainly clear
  return 0; // clear
}

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

// Collapse hourly readings into one entry per calendar date, considering only
// hours where startHour <= hour < endHour.
//
// Representative weather code: if any hour in the window has precip / fog /
// snow, pick the worst such hour (so a 3 PM shower doesn't hide behind an
// otherwise sunny afternoon). Otherwise the code is derived from the window's
// average cloud cover — Open-Meteo's cloud-only codes cluster around "partly
// cloudy" even at 70%+ cloud, which reads too sunny in the UI.
export function aggregateHourlyToDaily(
  hourly: HourlyWeather,
  startHour: number,
  endHour: number,
): DailyWeather[] {
  const byDay = new Map<string, number[]>();

  for (let i = 0; i < hourly.time.length; i++) {
    const t = hourly.time[i];
    const date = t.slice(0, 10);
    const hour = parseInt(t.slice(11, 13), 10);
    if (hour >= startHour && hour < endHour) {
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
    let cloudSum = 0;
    let cloudCount = 0;
    let worstPrecipCode: number | null = null;
    let worstPrecipScore = 101;

    for (const i of idx) {
      const temp = hourly.temperature_2m[i];
      if (typeof temp === 'number') {
        if (temp > tMax) tMax = temp;
        if (temp < tMin) tMin = temp;
      }
      precipProbMax = Math.max(precipProbMax, hourly.precipitation_probability[i] ?? 0);
      precipSum += hourly.precipitation[i] ?? 0;
      windMax = Math.max(windMax, hourly.wind_speed_10m[i] ?? 0);
      const cloud = hourly.cloud_cover?.[i];
      if (typeof cloud === 'number') {
        cloudSum += cloud;
        cloudCount += 1;
      }
      const code = hourly.weather_code[i] ?? 0;
      if (isPrecipOrFogCode(code)) {
        const score = weatherCodeBaseScore(code);
        if (score < worstPrecipScore) {
          worstPrecipScore = score;
          worstPrecipCode = code;
        }
      }
    }

    const avgCloud = cloudCount > 0 ? cloudSum / cloudCount : 0;
    const repCode = worstPrecipCode ?? cloudCoverToCode(avgCloud);

    days.push({
      isoDate: date,
      tMaxC: tMax === -Infinity ? 0 : tMax,
      tMinC: tMin === Infinity ? 0 : tMin,
      precipProb: Math.round(precipProbMax),
      precipMm: Math.round(precipSum * 10) / 10,
      windMaxKmh: windMax,
      weatherCode: repCode,
    });
  }

  return days;
}

function parseLocation(loc: OpenMeteoLocation): WeatherResponse {
  return { hourly: loc.hourly, fetchedAt: Date.now() };
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
  if (code === 1) return { emoji: '🌤️', label: 'Mostly sunny' };
  if (code === 2) return { emoji: '⛅', label: 'Partly cloudy' };
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
