export interface DailyWeather {
  isoDate: string;
  tMaxC: number;
  tMinC: number;
  precipProb: number; // 0-100
  precipMm: number;
  windMaxKmh: number;
  weatherCode: number; // WMO code
  sunshineHours: number;
}

export interface WeatherResponse {
  days: DailyWeather[];
  fetchedAt: number;
}

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
  weather_code: number[];
  sunshine_duration: number[];
}

interface OpenMeteoLocation {
  daily: OpenMeteoDaily;
}

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

const DAILY_PARAMS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_probability_max',
  'precipitation_sum',
  'wind_speed_10m_max',
  'weather_code',
  'sunshine_duration',
].join(',');

function parseLocation(loc: OpenMeteoLocation): WeatherResponse {
  const days: DailyWeather[] = loc.daily.time.map((iso, i) => ({
    isoDate: iso,
    tMaxC: loc.daily.temperature_2m_max[i],
    tMinC: loc.daily.temperature_2m_min[i],
    precipProb: loc.daily.precipitation_probability_max[i] ?? 0,
    precipMm: loc.daily.precipitation_sum[i] ?? 0,
    windMaxKmh: loc.daily.wind_speed_10m_max[i] ?? 0,
    weatherCode: loc.daily.weather_code[i] ?? 0,
    sunshineHours: (loc.daily.sunshine_duration[i] ?? 0) / 3600,
  }));
  return { days, fetchedAt: Date.now() };
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
    daily: DAILY_PARAMS,
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

