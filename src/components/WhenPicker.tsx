import { useEffect, useRef, useState } from 'react';
import type { DayOption } from '../lib/days';
import { DayChips } from './DayChips';
import { HourRangeSlider } from './HourRangeSlider';

interface Props {
  dayOptions: DayOption[];
  selectedDay: string;
  onSelectDay: (iso: string) => void;
  windowStart: number;
  windowEnd: number;
  windowMin: number;
  windowMax: number;
  onWindowChange: (start: number, end: number) => void;
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

// Single trigger that summarizes day + window ("Today · 10 AM – 4 PM ▾") and
// opens a popover with the existing DayChips + HourRangeSlider stacked. Closes
// on outside click or Esc; selections take effect immediately so there's no
// Apply button to manage.
export function WhenPicker({
  dayOptions,
  selectedDay,
  onSelectDay,
  windowStart,
  windowEnd,
  windowMin,
  windowMax,
  onWindowChange,
}: Props) {
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

  const activeDay = dayOptions.find((d) => d.isoDate === selectedDay) ?? dayOptions[0];
  const summaryHours = `${formatHour(windowStart)}-${formatHour(windowEnd)}`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Day and trip window: ${activeDay.label}, ${summaryHours}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-400"
      >
        <span className="font-semibold">{activeDay.label}</span>
        <span className="hidden text-slate-400 min-[520px]:inline">·</span>
        <span className="hidden tabular-nums min-[520px]:inline">{summaryHours}</span>
        <span className="ml-0.5 text-xs text-slate-400" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Pick day and trip window"
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-[300px] rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
        >
          <DayChips options={dayOptions} selected={selectedDay} onSelect={onSelectDay} />
          <div className="mt-3">
            <HourRangeSlider
              start={windowStart}
              end={windowEnd}
              min={windowMin}
              max={windowMax}
              onChange={onWindowChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
