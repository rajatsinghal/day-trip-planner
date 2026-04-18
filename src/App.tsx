import { useEffect, useMemo, useState } from 'react';
import { DESTINATIONS, ORIGIN, type Destination } from './data/destinations';
import { DayChips } from './components/DayChips';
import { SideList } from './components/SideList';
import { MapView } from './components/Map';
import { computeDayOptions } from './lib/days';
import { estimateDriveMinutes, haversineKm } from './lib/geo';
import type { TempUnit } from './lib/units';
import {
  fetchWeatherBatch,
  scoreBand,
  scoreWeather,
  type DailyWeather,
  type WeatherResponse,
} from './lib/weather';

const TEMP_UNIT_KEY = 'dtp.tempUnit';
const WEATHER_BATCH_SIZE = 10;

export interface EnrichedDestination extends Destination {
  driveMinutes: number;
  weather: DailyWeather | null;
  score: number | null;
  band: 'great' | 'ok' | 'poor' | null;
}

type WeatherMap = Record<string, WeatherResponse>;

function App() {
  const dayOptions = useMemo(() => computeDayOptions(), []);
  const [selectedDay, setSelectedDay] = useState(dayOptions[0].isoDate);
  const [weatherByDest, setWeatherByDest] = useState<WeatherMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tempUnit, setTempUnit] = useState<TempUnit>(() => {
    return localStorage.getItem(TEMP_UNIT_KEY) === 'F' ? 'F' : 'C';
  });

  useEffect(() => {
    localStorage.setItem(TEMP_UNIT_KEY, tempUnit);
  }, [tempUnit]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Batch destinations 10-at-a-time and call Open-Meteo's multi-coord endpoint.
    // Results stream in per batch so the UI can render the first rows while the
    // rest are still in flight.
    const batches: (typeof DESTINATIONS)[] = [];
    for (let i = 0; i < DESTINATIONS.length; i += WEATHER_BATCH_SIZE) {
      batches.push(DESTINATIONS.slice(i, i + WEATHER_BATCH_SIZE));
    }

    let successes = 0;
    const jobs = batches.map(async (batch) => {
      try {
        const responses = await fetchWeatherBatch(
          batch.map((d) => ({ lat: d.lat, lon: d.lon })),
          controller.signal,
        );
        if (cancelled) return;
        successes += 1;
        setWeatherByDest((prev) => {
          const next = { ...prev };
          responses.forEach((wx, idx) => {
            const dest = batch[idx];
            if (dest) next[dest.id] = wx;
          });
          return next;
        });
      } catch (e) {
        if ((e as Error).name === 'AbortError') throw e;
        console.warn('Weather batch failed:', e);
      }
    });

    Promise.all(jobs)
      .then(() => {
        if (cancelled) return;
        setLoading(false);
        if (successes === 0) {
          setError('Could not load weather data. Check your internet connection.');
        }
      })
      .catch((e) => {
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const rows: EnrichedDestination[] = useMemo(() => {
    const enriched = DESTINATIONS.map((d) => {
      const distanceKm = haversineKm(ORIGIN, d);
      const driveMinutes = estimateDriveMinutes(distanceKm);
      const wx = weatherByDest[d.id];
      const day = wx?.days.find((x) => x.isoDate === selectedDay) ?? null;
      const score = day ? scoreWeather(day) : null;
      const band = score !== null ? scoreBand(score) : null;
      return { ...d, driveMinutes, weather: day, score, band };
    });
    enriched.sort((a, b) => {
      if (a.score === null && b.score === null) return a.driveMinutes - b.driveMinutes;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      if (b.score !== a.score) return b.score - a.score;
      return a.driveMinutes - b.driveMinutes;
    });
    return enriched;
  }, [weatherByDest, selectedDay]);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-base font-semibold text-slate-900">Day Trip Planner</h1>
          <span className="text-xs text-slate-500">from {ORIGIN.name}</span>
        </div>
        <div className="flex-1" />
        <DayChips options={dayOptions} selected={selectedDay} onSelect={setSelectedDay} />
        <div
          className="ml-1 flex overflow-hidden rounded-lg border border-slate-200 text-xs"
          role="group"
          aria-label="Temperature units"
        >
          {(['C', 'F'] as const).map((u) => {
            const active = tempUnit === u;
            return (
              <button
                key={u}
                onClick={() => setTempUnit(u)}
                className={
                  'px-2 py-1 font-semibold transition-colors ' +
                  (active
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100')
                }
              >
                °{u}
              </button>
            );
          })}
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <main className="grid flex-1 min-h-0 grid-cols-1 md:grid-cols-[340px_1fr]">
        <aside className="overflow-y-auto border-r border-slate-200 bg-white">
          <SideList
            rows={rows}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onHover={setHoveredId}
            loading={loading}
            tempUnit={tempUnit}
          />
        </aside>
        <section className="relative">
          <MapView
            rows={rows}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={setSelectedId}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
