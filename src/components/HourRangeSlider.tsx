interface Props {
  start: number;
  end: number;
  min?: number;
  max?: number;
  minGap?: number;
  onChange: (start: number, end: number) => void;
}

function formatHour(h: number): string {
  const wrapped = h === 24 ? 24 : h % 24;
  if (wrapped === 0) return '12 AM';
  if (wrapped === 12) return '12 PM';
  if (wrapped === 24) return '12 AM';
  if (wrapped < 12) return `${wrapped} AM`;
  return `${wrapped - 12} PM`;
}

export function HourRangeSlider({
  start,
  end,
  min = 0,
  max = 24,
  minGap = 2,
  onChange,
}: Props) {
  const leftPct = ((start - min) / (max - min)) * 100;
  const rightPct = ((end - min) / (max - min)) * 100;

  const handleStart = (v: number) => {
    const clamped = Math.max(min, Math.min(v, end - minGap));
    onChange(clamped, end);
  };

  const handleEnd = (v: number) => {
    const clamped = Math.min(max, Math.max(v, start + minGap));
    onChange(start, clamped);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center h-6 w-40 select-none">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-slate-200" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-slate-900"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={start}
          onChange={(e) => handleStart(parseInt(e.target.value, 10))}
          className="dtp-range"
          aria-label="Window start hour"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={end}
          onChange={(e) => handleEnd(parseInt(e.target.value, 10))}
          className="dtp-range"
          aria-label="Window end hour"
        />
      </div>
      <span className="text-xs font-medium text-slate-700 whitespace-nowrap tabular-nums">
        {formatHour(start)} – {formatHour(end)}
      </span>
    </div>
  );
}
