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
}

export interface WeatherResponse {
  hourly: HourlyWeather;
  fetchedAt: number;
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
// Representative weather code:
// - Precip / fog / snow / thunder (code >= 45): worst hour wins. A single
//   rainy hour in the window dominates, so trip-relevant weather events are
//   never hidden.
// - Cloud-only hours (0-3): pick the MODE (most common code). Ties break
//   toward the worse code. Matches how a human describes the sky — 5 sunny
//   hours + 1 cloudy hour reads as "mostly sunny", not "cloudy".
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
    let worstPrecipCode: number | null = null;
    const cloudCounts = new Map<number, number>();

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
      if (code >= 45) {
        if (
          worstPrecipCode === null ||
          weatherCodeBaseScore(code) < weatherCodeBaseScore(worstPrecipCode)
        ) {
          worstPrecipCode = code;
        }
      } else {
        cloudCounts.set(code, (cloudCounts.get(code) ?? 0) + 1);
      }
    }

    let repCode: number;
    if (worstPrecipCode !== null) {
      repCode = worstPrecipCode;
    } else {
      // Mode of cloud codes; on count tie, prefer the code with the lower
      // base score (the worse one). The order we visit Map entries doesn't
      // matter — the tie-break always lands on the same code.
      repCode = 0;
      let bestCount = -1;
      for (const [code, count] of cloudCounts) {
        const better =
          count > bestCount ||
          (count === bestCount && weatherCodeBaseScore(code) < weatherCodeBaseScore(repCode));
        if (better) {
          repCode = code;
          bestCount = count;
        }
      }
    }

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

// WMO weather code -> short label + emoji
export function weatherCodeToLabel(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: '☀️', label: 'Clear' };
  if (code === 1) return { emoji: '🌤️', label: 'Mostly sunny' };
  if (code === 2) return { emoji: '⛅', label: 'Partly cloudy' };
  if (code === 3) return { emoji: '☁️', label: 'Cloudy' };
  if (code >= 45 && code <= 48) return { emoji: '🌫️', label: 'Foggy' };
  if (code >= 51 && code <= 57) return { emoji: '🌦️', label: 'Drizzle' };
  if (code >= 61 && code <= 67) return { emoji: '🌧️', label: 'Rainy' };
  if (code >= 71 && code <= 77) return { emoji: '🌨️', label: 'Snowy' };
  if (code >= 80 && code <= 82) return { emoji: '🌦️', label: 'Showers' };
  if (code >= 85 && code <= 86) return { emoji: '🌨️', label: 'Snow showers' };
  if (code >= 95) return { emoji: '⛈️', label: 'Thunderstorm' };
  return { emoji: '❓', label: 'Unknown' };
}
