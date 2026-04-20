import { useEffect, useRef, useState } from 'react';
import type { TempUnit } from '../lib/units';

interface Props {
  tempUnit: TempUnit;
  onTempUnitChange: (u: TempUnit) => void;
}

// Gear-icon dropdown for set-and-forget preferences. Currently just the
// °C/°F toggle; future home for things like default trip window or country.
export function SettingsMenu({ tempUnit, onTempUnitChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Settings"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-400"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Settings"
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-48 rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
        >
          <div className="text-xs font-medium text-slate-500">Units</div>
          <div className="mt-1.5 flex overflow-hidden rounded-lg border border-slate-200 text-xs">
            {(['F', 'C'] as const).map((u) => {
              const active = tempUnit === u;
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() => onTempUnitChange(u)}
                  className={
                    'flex-1 px-2 py-1.5 font-semibold transition-colors ' +
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
        </div>
      )}
    </div>
  );
}
