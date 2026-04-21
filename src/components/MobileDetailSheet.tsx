import { useEffect, useState } from 'react';
import type { EnrichedDestination } from '../App';
import { formatDriveTime } from '../lib/geo';
import { REASON_META } from '../lib/reasons_to_visit';
import { formatTemp, formatWind, type TempUnit } from '../lib/units';
import { weatherCodeToLabel } from '../lib/weather';

interface Props {
  row: EnrichedDestination;
  onClose: () => void;
  tempUnit: TempUnit;
}

// Mobile-only bottom sheet: the detail view for a destination card. Mirrors
// the desktop hover popover in content (emoji, name, weather metadata,
// blurb, full reason pills) but presents as a slide-up sheet over a scrim,
// which is the mobile-native pattern for "tell me more about this thing".
// Dismiss via scrim tap, close button, or Escape.
export function MobileDetailSheet({ row, onClose, tempUnit }: Props) {
  const wx = row.weather;
  const wxLabel = wx ? weatherCodeToLabel(wx.weatherCode) : null;

  // Slide-up animation on mount. We don't animate the exit — the parent
  // unmounts the sheet immediately on close, which is fast enough to feel
  // responsive without needing the exit-animation plumbing.
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.name)}`;

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={row.name}
    >
      <div
        className={
          'absolute inset-0 bg-slate-900/40 transition-opacity duration-200 ' +
          (show ? 'opacity-100' : 'opacity-0')
        }
        onClick={onClose}
      />
      <div
        className={
          'absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl transition-transform duration-200 ' +
          (show ? 'translate-y-0' : 'translate-y-full')
        }
      >
        {/* Sticky header needs enough height to fully contain the 32px close
            button — otherwise the button overflows into the content below
            and collides with the drive-time at the right edge of the name
            row. h-11 gives 4px vertical margin around the button. */}
        <div className="sticky top-0 z-10 bg-white">
          <div className="relative flex h-11 items-center justify-center">
            <span className="h-1.5 w-10 rounded-full bg-slate-300" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-4 pb-6">
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0 text-4xl leading-none" aria-hidden>
              {wxLabel ? wxLabel.emoji : '·'}
            </span>
            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
              <h2 className="font-semibold leading-snug text-slate-900">{row.name}</h2>
              <span className="whitespace-nowrap text-xs text-slate-500">
                {formatDriveTime(row.driveMinutes)}
              </span>
            </div>
          </div>
          {wx && wxLabel ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
              <span>{wxLabel.label}</span>
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
            <div className="mt-2 text-xs text-slate-400">No forecast</div>
          )}
          <p className="mt-3 text-sm leading-snug text-slate-700">{row.blurb}</p>
          {row.reasons_to_visit.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {row.reasons_to_visit.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1 text-xs text-slate-800"
                >
                  <span
                    className="flex h-[1.25em] w-[1.25em] flex-shrink-0 items-center justify-center text-base"
                    aria-hidden
                  >
                    {REASON_META[r].emoji}
                  </span>
                  {REASON_META[r].label}
                </span>
              ))}
            </div>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Open in Google Maps
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
      </div>
    </div>
  );
}
