import { useEffect, useMemo, useState } from 'react';
import { DESTINATIONS, ORIGIN, type Destination } from './data/destinations';
import { DayChips } from './components/DayChips';
import { SideList } from './components/SideList';
import { MapView } from './components/Map';
import { computeDayOptions } from './lib/days';
import { estimateDriveMinutes, haversineKm } from './lib/geo';
import {
  fetchWeather,
  scoreBand,
  scoreWeather,
  type DailyWeather,
  type WeatherResponse,
} from './lib/weather';

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

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Fetch all destinations in parallel; tolerate individual failures.
    const jobs = DESTINATIONS.map(async (d) => {
      try {
        const wx = await fetchWeather(d.lat, d.lon, controller.signal);
        return [d.id, wx] as const;
      } catch (e) {
        if ((e as Error).name === 'AbortError') throw e;
        return null;
      }
    });

    Promise.all(jobs)
      .then((results) => {
        if (cancelled) return;
        const map: WeatherMap = {};
        for (const r of results) {
          if (r) map[r[0]] = r[1];
        }
        setWeatherByDest(map);
        setLoading(false);
        if (Object.keys(map).length === 0) {
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
      return b.score - a.score;
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
