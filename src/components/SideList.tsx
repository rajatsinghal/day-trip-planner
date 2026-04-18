import { useEffect, useRef } from 'react';
import type { EnrichedDestination } from '../App';
import { formatDriveTime } from '../lib/geo';
import { formatTemp, formatWind, type TempUnit } from '../lib/units';
import { weatherCodeToLabel } from '../lib/weather';

interface Props {
  rows: EnrichedDestination[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  loading: boolean;
  tempUnit: TempUnit;
}

const BAND_COLOR: Record<'great' | 'ok' | 'poor', string> = {
  great: 'bg-emerald-500',
  ok: 'bg-sky-500',
  poor: 'bg-slate-400',
};

const BAND_BAR: Record<'great' | 'ok' | 'poor', string> = {
  great: 'bg-emerald-500',
  ok: 'bg-sky-500',
  poor: 'bg-slate-500',
};

export function SideList({ rows, selectedId, onSelect, onHover, loading, tempUnit }: Props) {
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  useEffect(() => {
    if (!selectedId) return;
    const el = rowRefs.current.get(selectedId);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  if (loading && rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Loading weather…
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-200">
      {rows.map((row) => {
        const isSelected = row.id === selectedId;
        const band = row.band ?? 'poor';
        const wx = row.weather;
        const label = wx ? weatherCodeToLabel(wx.weatherCode) : null;
        return (
          <li
            key={row.id}
            ref={(el) => {
              if (el) rowRefs.current.set(row.id, el);
              else rowRefs.current.delete(row.id);
            }}
            className="relative"
          >
            {isSelected && (
              <span
                className={'absolute inset-y-0 left-0 w-1 ' + BAND_BAR[band]}
                aria-hidden
              />
            )}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelect(row.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(row.id);
                }
              }}
              onMouseEnter={() => onHover(row.id)}
              onMouseLeave={() => onHover(null)}
              className={
                'w-full text-left px-3 py-2.5 flex gap-3 items-start transition-colors cursor-pointer ' +
                (isSelected ? 'bg-slate-200' : 'hover:bg-slate-50')
              }
            >
              <span
                className={'mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ' + BAND_COLOR[band]}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-1 min-w-0">
                    <span
                      className={
                        'truncate ' +
                        (isSelected ? 'font-semibold text-slate-900' : 'font-medium text-slate-900')
                      }
                    >
                      {row.name}
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      title="Open in Google Maps"
                      aria-label={`Open ${row.name} in Google Maps`}
                      className={
                        'flex-shrink-0 text-slate-500 transition-opacity hover:text-slate-900 focus:text-slate-900 focus:outline-none ' +
                        (isSelected ? 'opacity-80 hover:opacity-100' : 'opacity-40 hover:opacity-100')
                      }
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M11 4h5v5" />
                        <path d="M16 4l-8 8" />
                        <path d="M14 12v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" />
                      </svg>
                    </a>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {formatDriveTime(row.driveMinutes)}
                  </span>
                </div>
                {wx && label ? (
                  <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-x-2 gap-y-0.5 flex-wrap">
                    <span>
                      {label.emoji} {label.label}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span>
                      {formatTemp(wx.tMaxC, tempUnit)} / {formatTemp(wx.tMinC, tempUnit)}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span>Rain {wx.precipProb}%</span>
                    <span className="text-slate-400">·</span>
                    <span>Wind {formatWind(wx.windMaxKmh, tempUnit)}</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 mt-0.5">No forecast</div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
