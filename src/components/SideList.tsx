import type { EnrichedDestination } from '../App';
import { formatDriveTime } from '../lib/geo';
import { weatherCodeToLabel } from '../lib/weather';

interface Props {
  rows: EnrichedDestination[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  loading: boolean;
}

const BAND_COLOR: Record<'great' | 'ok' | 'poor', string> = {
  great: 'bg-emerald-500',
  ok: 'bg-amber-400',
  poor: 'bg-slate-400',
};

export function SideList({ rows, selectedId, onSelect, onHover, loading }: Props) {
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
        const selected = row.id === selectedId;
        const band = row.band ?? 'poor';
        const wx = row.weather;
        const label = wx ? weatherCodeToLabel(wx.weatherCode) : null;
        return (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onSelect(row.id)}
              onMouseEnter={() => onHover(row.id)}
              onMouseLeave={() => onHover(null)}
              className={
                'w-full text-left px-3 py-2.5 flex gap-3 items-start transition-colors ' +
                (selected ? 'bg-slate-100' : 'hover:bg-slate-50')
              }
            >
              <span
                className={'mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ' + BAND_COLOR[band]}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-900 truncate">{row.name}</span>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {formatDriveTime(row.driveMinutes)}
                  </span>
                </div>
                {wx && label ? (
                  <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>
                      {label.emoji} {label.label}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span>
                      {Math.round(wx.tMaxC)}° / {Math.round(wx.tMinC)}°
                    </span>
                    <span className="text-slate-400">·</span>
                    <span>Rain {wx.precipProb}%</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 mt-0.5">No forecast</div>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
