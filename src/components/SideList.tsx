import { useEffect, useRef, useState } from 'react';
import type { EnrichedDestination } from '../App';
import { formatDriveTime } from '../lib/geo';
import { REASON_META } from '../lib/reasons';
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

const HOVER_DELAY_MS = 250;

export function SideList({ rows, selectedId, onSelect, onHover, loading, tempUnit }: Props) {
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const hoverTimer = useRef<number | null>(null);
  const [popover, setPopover] = useState<{
    row: EnrichedDestination;
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    const el = rowRefs.current.get(selectedId);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  function openPopover(row: EnrichedDestination) {
    const el = rowRefs.current.get(row.id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPopover({ row, top: rect.top, left: rect.right + 8 });
  }

  function scheduleHover(row: EnrichedDestination) {
    onHover(row.id);
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => openPopover(row), HOVER_DELAY_MS);
  }

  function cancelHover() {
    onHover(null);
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setPopover(null);
  }

  if (loading && rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Loading weather…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500 px-4 text-center">
        No destinations match the selected filters.
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-slate-200">
        {rows.map((row) => {
          const isSelected = row.id === selectedId;
          const band = row.band ?? 'poor';
          const wx = row.weather;
          const label = wx ? weatherCodeToLabel(wx.weatherCode) : null;
          const visibleReasons = row.reasons.slice(0, 4);
          const extraReasonCount = row.reasons.length - visibleReasons.length;
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
                onMouseEnter={() => scheduleHover(row)}
                onMouseLeave={cancelHover}
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
                          (isSelected
                            ? 'font-semibold text-slate-900'
                            : 'font-medium text-slate-900')
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
                  {visibleReasons.length > 0 && (
                    <div
                      className="mt-0.5 flex items-center gap-1 text-sm"
                      aria-hidden
                    >
                      {visibleReasons.map((r) => (
                        <span key={r} title={REASON_META[r].label}>
                          {REASON_META[r].emoji}
                        </span>
                      ))}
                      {extraReasonCount > 0 && (
                        <span className="text-[11px] text-slate-500">
                          +{extraReasonCount}
                        </span>
                      )}
                    </div>
                  )}
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
      {popover && <HoverCard row={popover.row} top={popover.top} left={popover.left} tempUnit={tempUnit} />}
    </>
  );
}

interface HoverCardProps {
  row: EnrichedDestination;
  top: number;
  left: number;
  tempUnit: TempUnit;
}

function HoverCard({ row, top, left, tempUnit }: HoverCardProps) {
  const wx = row.weather;
  const wxLabel = wx ? weatherCodeToLabel(wx.weatherCode) : null;
  // Clamp to viewport: if the card would overflow the right edge, pin it to 8px margin.
  const width = 300;
  const margin = 8;
  const maxLeft = window.innerWidth - width - margin;
  const clampedLeft = Math.min(left, maxLeft);
  const maxTop = window.innerHeight - 200 - margin;
  const clampedTop = Math.min(top, Math.max(margin, maxTop));

  return (
    <div
      className="pointer-events-none fixed z-40 rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
      style={{ top: clampedTop, left: clampedLeft, width }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-slate-900 leading-snug">{row.name}</div>
        <span className="text-xs text-slate-500 flex-shrink-0 whitespace-nowrap">
          {formatDriveTime(row.driveMinutes)}
        </span>
      </div>
      {wx && wxLabel && (
        <div className="mt-1.5 text-xs text-slate-600">
          {wxLabel.emoji} {wxLabel.label} · {formatTemp(wx.tMaxC, tempUnit)} /{' '}
          {formatTemp(wx.tMinC, tempUnit)} · Rain {wx.precipProb}% · Wind{' '}
          {formatWind(wx.windMaxKmh, tempUnit)}
        </div>
      )}
      <p className="mt-2 text-sm leading-snug text-slate-700">{row.blurb}</p>
      {row.reasons.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {row.reasons.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
            >
              <span aria-hidden>{REASON_META[r].emoji}</span>
              {REASON_META[r].label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
