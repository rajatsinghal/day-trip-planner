import { useEffect, useMemo, useState } from 'react';
import { HUBS, HUBS_BY_ID, defaultHub, type Destination, type ReasonsToVisit } from './hubs';
import { SideList } from './components/SideList';
import { MapView } from './components/Map';
import { BottomCardStrip } from './components/BottomCardStrip';
import { ReasonChips, ReasonCount } from './components/ReasonFilter';
import { SettingsMenu } from './components/SettingsMenu';
import { WhenPicker } from './components/WhenPicker';
import { computeDayOptions } from './lib/days';
import { estimateDriveMinutes, haversineKm } from './lib/geo';
import { REASON_ORDER } from './lib/reasons_to_visit';
import type { TempUnit } from './lib/units';
import {
  aggregateHourlyToDaily,
  scoreWeather,
  type DailyWeather,
  type WeatherResponse,
} from './lib/weather';
import { fetchNwsForDest } from './lib/nws';

const TEMP_UNIT_KEY = 'dtp.tempUnit';
const WINDOW_KEY = 'dtp.windowHours';
const REASONS_KEY = 'dtp.selectedReasons';
const HUB_KEY = 'dtp.selectedHub';
const HUB_PARAM = 'hub';
const FETCH_CONCURRENCY = 8;
const WINDOW_MIN_HOUR = 4;
const WINDOW_MAX_HOUR = 22;
const DEFAULT_WINDOW: [number, number] = [10, 16];
const VALID_REASONS = new Set<ReasonsToVisit>(REASON_ORDER);
const REPO_URL = 'https://github.com/rajatsinghal/day-trip-planner';

export interface EnrichedDestination extends Destination {
  driveMinutes: number;
  weather: DailyWeather | null;
  score: number | null;
}

type WeatherMap = Record<string, WeatherResponse>;

function App() {
  // Hub selection: URL param wins, then localStorage, then default. Both URL
  // and storage values are validated against HUBS_BY_ID so a stale slug
  // (e.g. a hub that was renamed or removed) falls through to the default.
  const [selectedHubId, setSelectedHubId] = useState<string>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get(HUB_PARAM);
    if (fromUrl && HUBS_BY_ID.has(fromUrl)) return fromUrl;
    const fromStorage = localStorage.getItem(HUB_KEY);
    if (fromStorage && HUBS_BY_ID.has(fromStorage)) return fromStorage;
    return defaultHub.id;
  });
  const selectedHub = HUBS_BY_ID.get(selectedHubId) ?? defaultHub;

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
    // US-targeted app (NWS-only data), so default to F. Existing visitors
    // who explicitly picked C keep it; everyone else lands on °F + mph.
    return localStorage.getItem(TEMP_UNIT_KEY) === 'C' ? 'C' : 'F';
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

  useEffect(() => {
    localStorage.setItem(HUB_KEY, selectedHubId);
    // Mirror to the URL so the choice is shareable. replaceState (not push)
    // keeps the back button from being polluted by hub switches.
    const url = new URL(window.location.href);
    url.searchParams.set(HUB_PARAM, selectedHubId);
    window.history.replaceState({}, '', url);
  }, [selectedHubId]);

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
    // Reset weather when the hub changes — the previous hub's data is for
    // a different set of destinations and would briefly show in the list.
    setWeatherByDest({});

    // Concurrency-limited worker pool. Each destination needs a two-step NWS
    // fetch, so we pull from a shared queue with N workers rather than firing
    // all 80+ at once. Results stream into state per-destination — the list
    // and map populate incrementally as each forecast lands.
    const queue = [...selectedHub.destinations];
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
  }, [selectedHub]);

  // Dynamic window clamp: when "Today" is the selected day, the start of the
  // user's preferred trip window can be in the past (e.g. it's 2 PM but the
  // saved preference is 10 AM – 4 PM). Clamp the start to the current hour
  // so scoring and the slider both reflect what's actually plannable. Other
  // days use the user's preference unchanged. Computed at render time — if
  // the page sits open across an hour boundary the clamp is a tick stale,
  // which is fine.
  const todayIso = dayOptions[0].isoDate;
  const isToday = selectedDay === todayIso;
  const currentHour = new Date().getHours();
  const effectiveWindowMin = isToday
    ? Math.min(WINDOW_MAX_HOUR - 1, Math.max(WINDOW_MIN_HOUR, currentHour))
    : WINDOW_MIN_HOUR;
  const displayWindowStart = Math.max(windowHours[0], effectiveWindowMin);
  const displayWindowEnd = Math.max(windowHours[1], displayWindowStart + 1);

  const rows: EnrichedDestination[] = useMemo(() => {
    const startHour = displayWindowStart;
    const endHour = displayWindowEnd;
    const enriched = selectedHub.destinations.map((d) => {
      const distanceKm = haversineKm(selectedHub.center, d);
      const driveMinutes = estimateDriveMinutes(distanceKm);
      const wx = weatherByDest[d.id];
      const days = wx ? aggregateHourlyToDaily(wx.hourly, startHour, endHour) : null;
      const day = days?.find((x) => x.isoDate === selectedDay) ?? null;
      const score = day ? scoreWeather(day) : null;
      return { ...d, driveMinutes, weather: day, score };
    });
    enriched.sort((a, b) => {
      if (a.score === null && b.score === null) return a.driveMinutes - b.driveMinutes;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      if (b.score !== a.score) return b.score - a.score;
      return a.driveMinutes - b.driveMinutes;
    });
    return enriched;
  }, [weatherByDest, selectedDay, displayWindowStart, displayWindowEnd, selectedHub]);

  const filteredRows = useMemo(() => {
    if (selectedReasons.size === 0) return rows;
    return rows.filter((r) => r.reasons_to_visit.some((x) => selectedReasons.has(x)));
  }, [rows, selectedReasons]);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 px-3 py-2 md:items-start">
          {/* Title block: inline on phone, stacked on >=sm. The "in" word
              drops on phone in favor of a "·" separator so the lockup reads
              as one tidy line ([icon] DayTrip · Seattle ▾). */}
          <div className="flex flex-shrink-0 items-center gap-2 md:flex-col md:items-start md:gap-1 md:self-center">
            <h1 className="flex items-center gap-2 leading-none">
              <img
                src="/logo-icon.png"
                alt=""
                className="h-9 w-auto"
                width={28}
                height={36}
              />
              <span className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
                DayTrip
              </span>
            </h1>
            <div className="flex items-baseline gap-1 leading-none">
              <span className="text-slate-400 md:hidden" aria-hidden>
                ·
              </span>
              <span className="hidden text-xs text-slate-500 md:inline">in</span>
              <div className="relative">
                <select
                  value={selectedHubId}
                  onChange={(e) => setSelectedHubId(e.target.value)}
                  className="cursor-pointer appearance-none bg-transparent pr-4 text-sm font-bold text-slate-800 hover:text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  aria-label="Area"
                >
                  {HUBS.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                <span
                  className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-slate-500"
                  aria-hidden
                >
                  ▾
                </span>
              </div>
            </div>
          </div>
          {/* Chips inline (>=sm only). On <sm the chips render in their own
              row below for horizontal-scroll. */}
          <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-1.5 md:flex">
            <ReasonChips selected={selectedReasons} onToggle={toggleReason} />
            <ReasonCount
              totalCount={rows.length}
              matchCount={filteredRows.length}
              hasSelection={selectedReasons.size > 0}
              onClear={clearReasons}
            />
          </div>
          {/* Push controls right on phone (no inline chips to fill the space). */}
          <div className="flex-1 md:hidden" />
          <WhenPicker
            dayOptions={dayOptions}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            windowStart={displayWindowStart}
            windowEnd={displayWindowEnd}
            windowMin={effectiveWindowMin}
            windowMax={WINDOW_MAX_HOUR}
            onWindowChange={(s, e) => setWindowHours([s, e])}
          />
          <SettingsMenu tempUnit={tempUnit} onTempUnitChange={setTempUnit} />
        </div>
        {/* Phone-only chip strip: flex column-wrap so chips fill down then
            across. max-height pins it to exactly 2 rows; overflow-x-auto
            lets the strip scroll right. Each flex column is only as wide as
            its widest chip, so "Lake" is visibly narrower than "Waterfall". */}
        <div className="grid grid-flow-col grid-rows-2 auto-cols-[5.5rem] gap-x-1.5 gap-y-1 overflow-x-auto border-t border-slate-100 px-3 py-1 md:hidden">
          <ReasonChips selected={selectedReasons} onToggle={toggleReason} />
          <ReasonCount
            totalCount={rows.length}
            matchCount={filteredRows.length}
            hasSelection={selectedReasons.size > 0}
            onClear={clearReasons}
          />
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <main className="grid flex-1 min-h-0 grid-cols-1 md:grid-cols-[340px_1fr]">
        <aside className="hidden overflow-y-auto border-r border-slate-200 bg-white md:block">
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
            key={selectedHub.id}
            rows={filteredRows}
            center={selectedHub.center}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={setSelectedId}
          />
          {/* Mobile-only carousel of destination cards. The desktop side list
              is hidden on <md; this strip is the touch substitute. The gradient
              wrapper lives here (not in BottomCardStrip) so the credit link can
              stack naturally above the cards in normal flow. */}
          <div className="md:hidden pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white via-white/85 to-transparent pt-8">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Built by Rajat Singhal — open source, contribute on GitHub"
              aria-label="Built by Rajat Singhal. Contribute on GitHub."
              className="pointer-events-auto ml-2 mb-1.5 inline-flex whitespace-nowrap rounded-md border border-slate-200 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-900"
            >
              <span aria-hidden>🔨</span> Rajat Singhal · Contribute ↗
            </a>
            <BottomCardStrip
              rows={filteredRows}
              selectedId={selectedId}
              onSelect={setSelectedId}
              tempUnit={tempUnit}
            />
          </div>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Built by Rajat Singhal — open source, contribute on GitHub"
            aria-label="Built by Rajat Singhal. Contribute on GitHub."
            className="absolute bottom-2 left-2 z-10 hidden items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-900 md:inline-flex"
          >
            <span aria-hidden>🔨</span> Rajat Singhal · Contribute ↗
          </a>
        </section>
      </main>
    </div>
  );
}

export default App;
