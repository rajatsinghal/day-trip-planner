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

interface OpenMeteoResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    weather_code: number[];
    sunshine_duration: number[];
  };
}

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

export async function fetchWeather(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<WeatherResponse> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'precipitation_sum',
      'wind_speed_10m_max',
      'weather_code',
      'sunshine_duration',
    ].join(','),
    timezone: 'auto',
    forecast_days: '10',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
  });

  const url = `${ENDPOINT}?${params}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  const json = (await res.json()) as OpenMeteoResponse;

  const days: DailyWeather[] = json.daily.time.map((iso, i) => ({
    isoDate: iso,
    tMaxC: json.daily.temperature_2m_max[i],
    tMinC: json.daily.temperature_2m_min[i],
    precipProb: json.daily.precipitation_probability_max[i] ?? 0,
    precipMm: json.daily.precipitation_sum[i] ?? 0,
    windMaxKmh: json.daily.wind_speed_10m_max[i] ?? 0,
    weatherCode: json.daily.weather_code[i] ?? 0,
    sunshineHours: (json.daily.sunshine_duration[i] ?? 0) / 3600,
  }));

  return { days, fetchedAt: Date.now() };
}

// Score 0-100. "Sunny & mild" = high temp in 18-28C, low rain, low wind, lots of sunshine.
export function scoreWeather(d: DailyWeather): number {
  const tempScore = bell(d.tMaxC, 22, 6); // peaks at 22C, width 6C
  const rainScore = clamp01(1 - d.precipProb / 100) * clamp01(1 - d.precipMm / 10);
  const windScore = clamp01(1 - Math.max(0, d.windMaxKmh - 15) / 40); // penalize above 15 km/h
  const sunScore = clamp01(d.sunshineHours / 9); // 9+ hrs of sun = max
  const composite = 0.35 * tempScore + 0.3 * rainScore + 0.15 * windScore + 0.2 * sunScore;
  return Math.round(composite * 100);
}

export function scoreBand(score: number): 'great' | 'ok' | 'poor' {
  if (score >= 70) return 'great';
  if (score >= 45) return 'ok';
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

function bell(x: number, center: number, width: number): number {
  const z = (x - center) / width;
  return Math.exp(-0.5 * z * z);
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
