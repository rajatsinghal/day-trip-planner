import { useEffect, useMemo, useState } from 'react';
import { DESTINATIONS, ORIGIN, type Destination, type ReasonsToVisit } from './data/destinations';
import { DayChips } from './components/DayChips';
import { SideList } from './components/SideList';
import { MapView } from './components/Map';
import { HourRangeSlider } from './components/HourRangeSlider';
import { ReasonFilter } from './components/ReasonFilter';
import { computeDayOptions } from './lib/days';
import { estimateDriveMinutes, haversineKm } from './lib/geo';
import { REASON_ORDER } from './lib/reasons_to_visit';
import type { TempUnit } from './lib/units';
import {
  aggregateHourlyToDaily,
  scoreBand,
  scoreWeather,
  type DailyWeather,
  type WeatherResponse,
} from './lib/weather';
import { fetchNwsForDest } from './lib/nws';

const TEMP_UNIT_KEY = 'dtp.tempUnit';
const WINDOW_KEY = 'dtp.windowHours';
const REASONS_KEY = 'dtp.selectedReasons';
const FETCH_CONCURRENCY = 8;
const WINDOW_MIN_HOUR = 4;
const WINDOW_MAX_HOUR = 22;
const DEFAULT_WINDOW: [number, number] = [10, 16];
const VALID_REASONS = new Set<ReasonsToVisit>(REASON_ORDER);

export interface EnrichedDestination extends Destination {
  driveMinutes: number;
  weather: DailyWeather | null;
  score: number | null;
  band: 'great' | 'ok' | 'poor' | null;
}

type WeatherMap = Record<string, WeatherResponse>;

function App() {
  const dayOptions = useMemo(() => computeDayOptions(), []);
  const [selectedDay, setSelectedDay] = useState(() => {
    // After 8 PM local, most of today's daytime is gone — land on tomorrow.
    const defaultIdx = new Date().getHours() >= 20 && dayOptions.length > 1 ? 1 : 0;
    return dayOptions[defaultIdx].isoDate;
  });
  const [weatherByDest, setWeatherByDest] = useState<WeatherMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tempUnit, setTempUnit] = useState<TempUnit>(() => {
    return localStorage.getItem(TEMP_UNIT_KEY) === 'F' ? 'F' : 'C';
  });
  const [selectedReasons, setSelectedReasons] = useState<Set<ReasonsToVisit>>(() => {
    try {
      const raw = localStorage.getItem(REASONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return new Set(parsed.filter((r): r is ReasonsToVisit => VALID_REASONS.has(r)));
        }
      }
    } catch {
      // ignore
    }
    return new Set<ReasonsToVisit>();
  });
  const [windowHours, setWindowHours] = useState<[number, number]>(() => {
    try {
      const raw = localStorage.getItem(WINDOW_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed) &&
          parsed.length === 2 &&
          typeof parsed[0] === 'number' &&
          typeof parsed[1] === 'number' &&
          parsed[0] >= WINDOW_MIN_HOUR &&
          parsed[1] <= WINDOW_MAX_HOUR &&
          parsed[0] < parsed[1]
        ) {
          return [parsed[0], parsed[1]];
        }
      }
    } catch {
      // fall through to default
    }
    return DEFAULT_WINDOW;
  });

  useEffect(() => {
    localStorage.setItem(TEMP_UNIT_KEY, tempUnit);
  }, [tempUnit]);

  useEffect(() => {
    localStorage.setItem(WINDOW_KEY, JSON.stringify(windowHours));
  }, [windowHours]);

  useEffect(() => {
    localStorage.setItem(REASONS_KEY, JSON.stringify(Array.from(selectedReasons)));
  }, [selectedReasons]);

  const toggleReason = (r: ReasonsToVisit) => {
    setSelectedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  };

  const clearReasons = () => setSelectedReasons(new Set());

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Concurrency-limited worker pool. Each destination needs a two-step NWS
    // fetch, so we pull from a shared queue with N workers rather than firing
    // all 80+ at once. Results stream into state per-destination — the list
    // and map populate incrementally as each forecast lands.
    const queue = [...DESTINATIONS];
    let successes = 0;
    let finishedWorkers = 0;

    async function worker() {
      while (queue.length > 0 && !controller.signal.aborted) {
        const dest = queue.shift();
        if (!dest) break;
        try {
          const wx = await fetchNwsForDest(dest, controller.signal);
          if (cancelled) return;
          successes += 1;
          setWeatherByDest((prev) => ({ ...prev, [dest.id]: wx }));
        } catch (e) {
          if ((e as Error).name === 'AbortError') return;
          console.warn(`NWS fetch failed for ${dest.id}:`, e);
        }
      }
      finishedWorkers += 1;
      if (finishedWorkers === FETCH_CONCURRENCY && !cancelled) {
        setLoading(false);
        if (successes === 0) {
          setError('Could not load weather data. Check your internet connection.');
        }
      }
    }

    for (let i = 0; i < FETCH_CONCURRENCY; i++) {
      worker();
    }

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const rows: EnrichedDestination[] = useMemo(() => {
    const [startHour, endHour] = windowHours;
    const enriched = DESTINATIONS.map((d) => {
      const distanceKm = haversineKm(ORIGIN, d);
      const driveMinutes = estimateDriveMinutes(distanceKm);
      const wx = weatherByDest[d.id];
      const days = wx ? aggregateHourlyToDaily(wx.hourly, startHour, endHour) : null;
      const day = days?.find((x) => x.isoDate === selectedDay) ?? null;
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
  }, [weatherByDest, selectedDay, windowHours]);

  const filteredRows = useMemo(() => {
    if (selectedReasons.size === 0) return rows;
    return rows.filter((r) => r.reasons_to_visit.some((x) => selectedReasons.has(x)));
  }, [rows, selectedReasons]);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-base font-semibold text-slate-900">Day Trip Planner</h1>
          <span className="text-xs text-slate-500">from {ORIGIN.name}</span>
        </div>
        <HourRangeSlider
          start={windowHours[0]}
          end={windowHours[1]}
          min={WINDOW_MIN_HOUR}
          max={WINDOW_MAX_HOUR}
          onChange={(s, e) => setWindowHours([s, e])}
        />
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

      <ReasonFilter
        selected={selectedReasons}
        onToggle={toggleReason}
        onClear={clearReasons}
        totalCount={rows.length}
        matchCount={filteredRows.length}
      />

      {error && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <main className="grid flex-1 min-h-0 grid-cols-1 md:grid-cols-[340px_1fr]">
        <aside className="overflow-y-auto border-r border-slate-200 bg-white">
          <SideList
            rows={filteredRows}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onHover={setHoveredId}
            loading={loading}
            tempUnit={tempUnit}
          />
        </aside>
        <section className="relative">
          <MapView
            rows={filteredRows}
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
